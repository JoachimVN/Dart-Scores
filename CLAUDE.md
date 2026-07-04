# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build       # tsc -b type-check, then vite build
npm run lint        # oxlint
npm test            # vitest (watch mode)
npm test -- run      # vitest single run
npx vitest run src/dartboard/hitTest.test.ts   # run a single test file
npm run preview     # serve the production build locally
```

There is no separate typecheck script; `npm run build` is the source of truth for type errors (`tsc -b` before the Vite build).

## Architecture

Dart-Scores is a client-only React 19 + TypeScript + Vite SPA for scoring X01 dart games. No backend — all state is `localStorage`-persisted.

### Layered structure

```
dartboard/   SVG board rendering + pure geometry/hit-testing (no game rules)
game/        Pure game-rule engines (x01, checkout), no React, no storage
storage/     localStorage read/write + versioned migrations
players/, settings/, stats/   Repositories built on storage/ for each persisted slice
hooks/       useGame wires the x01 engine to storage + React state
screens/, components/   UI
```

Data flows one way: `Dartboard` click → `hitTest.ts` resolves (segment, ring, value) → `PlayScreen` calls `onThrow` → `useGame.throwDart` → `x01Engine.applyThrow` (pure reducer) → new `GameState` → `gameRepository.saveActiveGame` persists it → React re-renders.

### Dartboard geometry (`src/dartboard/`)

All angles are degrees **clockwise from 12 o'clock**, consistently used for rendering and hit-testing so there's no mental offset between them (see comment at top of `geometry.ts`). `RING_RADII` in `geometry.ts` is the single source of truth for ring boundaries (as fractions of board radius `R = 1`) and is deliberately *not* to regulation scale — bull/double/treble rings are enlarged for tap accuracy. `hitTest.ts` converts a pixel click offset to polar coordinates and resolves it to a `HitResult` (segment + ring) purely from those radii/angles.

### X01 engine (`src/game/x01/x01Engine.ts`)

Pure functions over `X01State`, no side effects. Key design point: darts thrown during a turn accumulate in `currentTurnThrows` and are **not** committed to a player's `remaining`/`turns` until the turn ends (3 darts, a bust, or a win). This makes undo trivial — `undoLastThrow` either pops from the uncommitted `currentTurnThrows`, or (if the turn was already committed on its final dart) reopens the just-completed turn by restoring the prior score and turn ownership. `lastCompletedTurn` finds the most recent turn across all players by comparing throw timestamps, since the current player index moves on before the "just played" turn should stop being displayed (see how `PlayScreen` uses `isBetweenTurns` + `lastCompletedTurn` to keep showing the previous player's darts/badge until the next player's first throw).

### Storage & migrations (`src/storage/`)

Everything persists under one `localStorage` key (`STORAGE_KEY`) as a `PersistedEnvelope { schemaVersion, data }` wrapping a single `PersistedRoot { players, activeGame, settings, history }`. `schema.ts` defines the current shape and `CURRENT_SCHEMA_VERSION`; `migrations.ts` holds an ordered list of `{ from, to, migrate }` steps applied sequentially in `loadRoot`. **Whenever `PersistedRoot` (or a nested type it contains) changes shape, bump `CURRENT_SCHEMA_VERSION` and add a migration** — otherwise existing users' saved games/history/settings are silently discarded (falls back to `defaultRoot()` on version mismatch or parse failure). `players/`, `settings/`, `stats/`, and `storage/gameRepository.ts` are all thin read-modify-write wrappers around `loadRoot`/`saveRoot`.

### Deploying (portfolio sync)

This app has no backend of its own but is published as a static build to `joavn.dev/dart-scores`, embedded in a separate `Portfolio` repo. `.github/workflows/sync-portfolio.yml` builds with `--base=/dart-scores/` on every push to `main` (when `src/**` or build config changes) and pushes the built `dist/` into `JoachimVN/Portfolio`'s `dart-scores/` folder using a `PORTFOLIO_TOKEN` PAT secret. `sync-portfolio.sh` does the same thing locally/manually — it expects the `Portfolio` repo checked out as a sibling-ish directory (`PORTFOLIO_DIR` env var, defaults to `~/Documents/GitHub/Portfolio`). This pattern is mirrored across other repos (Versed, CHORIDOR-web, Music-Popularity-Index).
