# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Final Fight V2 is a pixel-art 2D side-scrolling action game built with **Phaser 3** + **TypeScript**, packaged as a desktop app with **Electron**. The game style is inspired by Metal Slug, Hollow Knight, and Hades.

## Commands

```bash
# Development (browser)
yarn dev

# Development (Electron desktop app)
yarn dev:electron

# Production build
yarn build

# Build Electron distributable
yarn build:electron

# Preview production build
yarn preview
```

No test framework is configured. No linter is configured.

## Architecture

### Scene-Based Game Loop (Phaser Pattern)

Game states are managed via `Phaser.Scene` classes in `src/scenes/`:
- **BootScene** — Asset preloading & animation definition
- **MenuScene** — Main menu
- **GameScene** — Core gameplay (entities, collisions, camera, level)
- **UIScene** — Overlay UI layer (health bars, stats panel, inventory)
- **GameOverScene / WinScene** — End states

Scenes are registered in `src/config/gameConfig.ts`. The game loop runs in `GameScene.update()`.

### Entity Hierarchy

- `Player` extends `Phaser.Physics.Arcade.Sprite` — state machine with `PlayerState` enum (IDLE, RUN, JUMP, ATTACK, HURT)
- `Enemy` (abstract base) extends `Phaser.Physics.Arcade.Sprite` — state machine with `EnemyState` enum (IDLE, PATROL, CHASE, ATTACK, HURT, DEAD)
- `SkeletonEnemy` extends `Enemy` — concrete enemy implementation

All entities live in `src/entities/`.

### Systems (`src/systems/`)

- **CombatSystem** — Attack detection (distance-based), damage calculation, knockback, crit logic
- **InputController** — Centralized keyboard input (A/D move, K jump, J attack, L dash, I inventory, C stats, P debug)
- **DecorationManager** — Environmental object spawning from `LevelConfig.ts`

### UI Components (`src/ui/`)

- **DamageText** — Floating damage numbers (white normal, gold crit)
- **HealthBar** — Entity health bar display
- **PlayerStatsPanel** — Toggle with C key
- **Inventory** — Toggle with I key

### Visual Feedback (`src/utils/`)

- **CameraShake** — 3 intensity levels (light/medium/heavy)
- **HitStop** — Frame freeze on impact (currently needs refactoring)
- **Constants.ts** — All game tuning parameters (physics, player stats, enemy stats, controls)

### Key Configuration

- `src/config/gameConfig.ts` — Phaser config (960x540, Arcade physics, pixel-art rendering)
- `src/utils/Constants.ts` — Game balance constants (health, speed, damage, cooldowns, ranges)
- `src/config/LevelConfig.ts` — Decoration placement data
- `vite.config.ts` — Vite + Electron plugin, path alias `@` → `/src`

### Physics

Uses Phaser's **Arcade Physics** with gravity (800 px/s²). Static platforms for ground, dynamic bodies for player/enemies. Collision detection is handled by Phaser's built-in overlap/collider system.

## Conventions

- Language: TypeScript with strict mode
- State management: Enum-based state machines on entities
- Animations: Defined programmatically in BootScene from sprite sheets
- Assets: Organized by type under `assets/` (player/, enemy/, backgrounds/, environment/, etc.)
- Depth layering: Uses DEPTH constants for z-ordering (background → decorations → entities → UI)
- Path alias: Use `@/` to reference `src/` in imports
