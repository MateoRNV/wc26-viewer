# Simulador de Bracket · Mundial 2026 (Dieciseisavos)

> 🌐 **Idiomas:** Español (este archivo) · [English](./README.md)

SPA estática client-side (React + Vite) que simula los **dieciseisavos de final**
del Mundial 2026, incluyendo el nuevo sistema de los **8 mejores terceros** y la
matriz FIFA (Anexo C) que asigna determinísticamente cada tercero a un ganador de
grupo evitando revanchas de la fase de grupos.

La interfaz está totalmente internacionalizada (español / inglés) y funciona
**100% offline** — no hay API ni backend; todos los datos viven en JSON y en el
estado en memoria.

---

## Tabla de Contenidos

1. [Inicio rápido](#inicio-rápido)
2. [Stack tecnológico](#stack-tecnológico)
3. [Cómo funciona (modelo de dominio)](#cómo-funciona-modelo-de-dominio)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Flujo de datos](#flujo-de-datos)
6. [La matriz de 495 combinaciones](#la-matriz-de-495-combinaciones)
7. [Internacionalización (i18n)](#internacionalización-i18n)
8. [Scripts](#scripts)
9. [Cómo extender el proyecto](#cómo-extender-el-proyecto)
10. [Estado del MVP y hoja de ruta](#estado-del-mvp-y-hoja-de-ruta)

---

## Inicio rápido

```bash
npm install
npm run gen:matrix   # (opcional) regenera public/matrix495.json
npm run dev          # http://localhost:5173
npm run build        # typecheck (tsc --noEmit) + build de producción a /dist
npm run preview      # sirve el /dist ya construido
```

`public/matrix495.json` ya viene versionado, así que solo necesitas
`gen:matrix` si modificas `scripts/generateMatrix.mjs`.

Requisitos: **Node 18+** (desarrollado en Node 24).

---

## Stack tecnológico

| Aspecto         | Elección                                  |
| --------------- | ----------------------------------------- |
| Framework       | React 18 + Vite 5 + TypeScript (strict)   |
| Estado global   | [Zustand](https://github.com/pmndrs/zustand) |
| Drag & drop     | [@dnd-kit](https://dndkit.com/) (core + sortable) |
| Estilos         | Tailwind CSS 3 + `src/styles/bracket.css` |
| i18n            | i18next + react-i18next + browser-languagedetector |
| Datos           | JSON estático en `/public` + mock en TS   |

Sin router (una sola pantalla), sin servidor, sin SSR.

---

## Cómo funciona (modelo de dominio)

El torneo tiene **12 grupos (A–L) × 4 equipos = 48 selecciones**. Tras la fase de
grupos:

- **12 ganadores** (1º) y **12 subcampeones** (2º) clasifican directo → casillas
  fijas del bracket.
- Los **12 terceros** se rankean entre sí; los **8 mejores** clasifican. Lo que
  varía es *qué* 8 grupos de los 12 aportan un tercero — hay
  `C(12,8) = 495` combinaciones posibles.
- Para cada combinación, la matriz FIFA dice exactamente qué tercero enfrenta a
  qué ganador de grupo (evitando una revancha de un partido de la fase de grupos).

Los **8 ganadores que enfrentan a un tercero** son los de los grupos **A, C, D,
E, G, I, K, L** (regla oficial FIFA 2026). Los otros 8 partidos emparejan a los
ganadores restantes (B, F, H, J) con subcampeones — una estructura fija.

Los tipos de TypeScript están en [`src/types.ts`](./src/types.ts): `Team`,
`Match`, `Group`, `BracketMatchup`, `BracketSlot`, `MatrixScenario`,
`ThirdPlaceRanking`, `ResolvedMatchup`.

---

## Estructura del proyecto

```
wc2026/
├── public/
│   └── matrix495.json          # 495 escenarios (generado) — se carga en runtime
├── scripts/
│   └── generateMatrix.mjs      # construye matrix495.json (npm run gen:matrix)
├── src/
│   ├── main.tsx                # entry: monta <App/>, importa i18n + estilos
│   ├── App.tsx                 # carga la matriz, renderiza Header + Layout
│   ├── types.ts                # todas las interfaces compartidas
│   ├── vite-env.d.ts           # referencia de tipos del cliente Vite
│   ├── data/
│   │   └── groups.mock.ts      # 12 grupos, 48 equipos, fixtures round-robin
│   ├── store/
│   │   └── appStore.ts         # store Zustand + motor de recálculo derive()
│   ├── utils/
│   │   ├── scoringRules.ts     # puntos/DG/GF, tabla de grupo, ranking terceros
│   │   ├── tiebreakers.ts      # comparadores (pts → DG → GF → fair-play → FIFA)
│   │   └── matrixEngine.ts     # resolveBracket() + relleno con equipos reales
│   ├── i18n/
│   │   ├── index.ts            # config de i18next + helper teamName()
│   │   └── locales/
│   │       ├── es.json         # textos en español (incl. nombres de equipos)
│   │       └── en.json         # textos en inglés (incl. nombres de equipos)
│   ├── components/
│   │   ├── Header.tsx          # título, toggle de modo, selector de idioma
│   │   ├── ModeToggle.tsx      # Simulador ↔ Sandbox
│   │   ├── LanguageSwitcher.tsx# ES / EN
│   │   ├── Layout.tsx          # grid 3 columnas (Grupos | Terceros | Bracket)
│   │   ├── GroupsPanel.tsx     # renderiza las 12 GroupCard
│   │   ├── GroupCard.tsx       # filas de tabla (arrastrables) + inputs de goles
│   │   ├── MatchInput.tsx      # inputs de goles de un partido
│   │   ├── ThirdPlaceTable.tsx # los 12 terceros rankeados, top-8 resaltado
│   │   ├── BracketPanel.tsx    # badge de escenario + bracket resuelto
│   │   └── BracketTree.tsx     # las 16 tarjetas de partido de dieciseisavos
│   └── styles/
│       └── bracket.css         # estilos personalizados de las tarjetas
└── index.html
```

---

## Flujo de datos

El store ([`src/store/appStore.ts`](./src/store/appStore.ts)) es la única fuente
de verdad. Cada mutación llama a la función pura `derive(groups, matrix)` que
recalcula el ranking de terceros y el bracket resuelto, manteniendo toda la UI
reactiva.

### Modo Simulador (por defecto)

1. El usuario edita goles en un `MatchInput` → `updateMatchResult(matchId, local, visitante)`.
2. El grupo afectado se reordena por resultados con `calculateGroupStandings()`
   (puntos → DG → GF → fair-play → ranking FIFA).
3. `rankThirdPlaces()` re-rankea los 12 terceros; los 8 mejores reciben
   `qualifies = true`.
4. Cuando hay exactamente 8 terceros clasificados, `findScenario()` busca la
   clave de combinación (ej. `"BCFHIJKL"`) en la matriz y
   `resolveMatchupsWithTeams()` rellena los 16 partidos con equipos concretos.

### Modo Sandbox

1. El usuario arrastra un equipo dentro de su grupo (`@dnd-kit`) →
   `reorderTeamInGroup()`.
2. El orden manual **es** la tabla (no se reordena por resultados). Quien quede
   3º se vuelve el candidato a tercero de ese grupo.
3. Corre el mismo recálculo de ranking + bracket. Al volver a Simulador, cada
   grupo se reordena de nuevo según los resultados.

> Las **métricas del ranking de terceros** (puntos/DG/GF) siempre vienen de los
> resultados de los partidos, incluso en Sandbox — arrastrar solo decide *quién*
> es 3º, no sus estadísticas.

---

## La matriz de 495 combinaciones

`public/matrix495.json` lo produce
[`scripts/generateMatrix.mjs`](./scripts/generateMatrix.mjs). Estructura:

```jsonc
{
  "scenarios": [
    {
      "groupCombination": "ABCDEFGH",   // 8 letras de grupo, ordenadas
      "official": false,                 // true = sembrado desde FIFA/Wikipedia
      "matchups": [
        { "matchNumber": 1, "team1": {"type":"winner","group":"A"},
          "team2": {"type":"third","group":"E"} },
        // ... 16 partidos en total
      ]
    }
    // ... 495 escenarios
  ]
}
```

### ⚠️ Aviso importante sobre los datos

- **8 escenarios son oficiales**, sembrados verbatim desde la tabla pública de
  FIFA/Wikipedia (objeto `SEED` en el generador, marcados `official: true`). Se
  muestran con un badge verde en la UI y sirven para validar el motor.
- Los **~487 escenarios restantes se generan** con un algoritmo determinista de
  *matching sin revancha* (un ganador nunca juega contra el tercero de su propio
  grupo). Se muestran con un badge ámbar de "asignación generada".

Es una decisión pragmática de MVP: la tabla completa del Anexo C (las 495 filas)
no es reproducible libremente en bloque, pero el motor es totalmente general.
**Para usar la tabla oficial**, expande el objeto `SEED` del generador con las
filas reales y corre `npm run gen:matrix`. Ni la estructura del bracket ni el
motor necesitan cambiar.

El generador además se autovalida: las 495 combinaciones son únicas, cada una
tiene 16 partidos, los terceros asignados siempre coinciden con el conjunto de la
combinación, y las filas generadas tienen cero revanchas de grupo.

---

## Internacionalización (i18n)

Implementado con **i18next + react-i18next**, configurado en
[`src/i18n/index.ts`](./src/i18n/index.ts).

- Las **llaves de traducción** viven en `src/i18n/locales/{es,en}.json`,
  agrupadas por área (`header`, `modes`, `panels`, `group`, `thirds`, `bracket`,
  `match`, `teams`).
- Los componentes leen los textos con el hook `useTranslation()`:
  `const { t } = useTranslation(); t('panels.groups')`.
- La interpolación usa `{{var}}`: `t('group.title', { letter: 'A' })`.
- Los **nombres de equipos también se traducen**, con llave por código de equipo
  bajo `teams.*`. Como el store/los componentes a veces operan fuera de React, el
  helper `teamName(code, fallback)` llama a `i18n.t` directamente y cae al nombre
  en español del mock si falta una llave.
- El idioma seleccionado se **persiste en `localStorage`** bajo la llave
  `wc2026-lang`, y se auto-detecta del navegador en la primera visita
  (`fallbackLng: 'es'`).

### Agregar un idioma nuevo (ej. portugués)

1. Crea `src/i18n/locales/pt.json` (copia `en.json` y traduce los valores).
2. En `src/i18n/index.ts`: agrega `pt` a `SUPPORTED_LANGUAGES` y a `resources`.
3. Listo — el `LanguageSwitcher` renderiza un botón por cada idioma soportado
   automáticamente.

---

## Scripts

| Comando               | Qué hace                                       |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo Vite con HMR            |
| `npm run build`       | typecheck `tsc --noEmit` + build de producción |
| `npm run preview`     | Sirve el `/dist` construido                    |
| `npm run gen:matrix`  | Regenera `public/matrix495.json`               |

---

## Cómo extender el proyecto

- **Rosters reales / datos en vivo:** edita `src/data/groups.mock.ts`. Cada grupo
  tiene 4 equipos y 6 partidos round-robin; los marcadores por defecto son
  placeholders deterministas. Para conectar una API en vivo más adelante,
  reemplaza `createInitialGroups()` y alimenta los resultados a
  `updateMatchResult`.
- **Fair-play / tarjetas amarillas:** `Match.yellowCards` ya existe en el modelo
  y alimenta el desempate; el mock las pone en 0 por ahora.
- **Árbol visual del bracket (SVG):** hoy el bracket es una grilla de tarjetas
  (`BracketTree.tsx`). Un árbol de torneo SVG clásico puede reemplazarlo sin
  tocar el motor.
- **Matriz oficial del Anexo C:** ver [el aviso de la matriz](#-aviso-importante-sobre-los-datos).

---

## Estado del MVP y hoja de ruta

- [x] Arranca con 12 grupos mockeados y tabla en vivo
- [x] **Simulador**: editar goles → tabla de terceros se actualiza → bracket se resuelve
- [x] **Sandbox**: arrastrar equipos → mismo recálculo
- [x] Toggle Simulador ↔ Sandbox cambia la UI
- [x] Motor de matriz validado contra las combinaciones oficiales sembradas
- [x] i18n completo (ES/EN) con idioma persistido, incl. nombres de equipos
- [ ] Reemplazar los ~487 escenarios generados con la tabla oficial del Anexo C
- [ ] Bracket como árbol de torneo en SVG
- [ ] Integración de datos en vivo / API

---

### Fuentes de datos

La regla de asignación de terceros y las 8 combinaciones sembradas se tomaron de
la documentación pública de la fase eliminatoria del Mundial 2026
([Wikipedia](https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage)).
El resto de la estructura del bracket es una reconstrucción internamente
consistente.
