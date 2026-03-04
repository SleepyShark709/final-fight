# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Final Fight V2 is a pixel-art 2D side-scrolling action game built with **Phaser 3** + **TypeScript**, packaged as a desktop app with **Electron**. The game style is inspired by Metal Slug, Hollow Knight, and Hades.

## Commands

```bash
# Development (browser) — runs on port 5173
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

This project uses **yarn** (v1.22). No test framework or linter is configured.

## Architecture

### Scene-Based Game Loop (Phaser Pattern)

Game states are managed via `Phaser.Scene` classes in `src/scenes/`:
- **BootScene** — Asset preloading (individual PNGs, not sprite sheets) & animation definition
- **MenuScene** — Main menu
- **GameScene** — Core gameplay: entity creation, collision setup, attack detection (both overlap-based and distance-based), parallax background, and game loop
- **UIScene** — Overlay UI layer (health bar, combo counter, inventory, pause menu). Runs parallel to GameScene.
- **GameOverScene / WinScene** — End states

Scenes are registered in `src/config/gameConfig.ts`. The game loop runs in `GameScene.update()`.

### Inter-Scene Communication

Scenes communicate via Phaser's event emitter system:
- `player-health-changed` — Player emits on health change, UIScene listens for health bar updates
- `player-died` — Player emits on death, GameScene listens to trigger game over transition
- `combo-count-changed` — Player emits on hit registration, UIScene listens for combo counter display
- `show-pause-menu` / `hide-pause-menu` — GameScene emits, UIScene listens

### Entity Hierarchy

All entities live in `src/entities/`. They extend `Phaser.Physics.Arcade.Sprite` with enum-based state machines.

- **`Player`** — States: IDLE, RUN, JUMP, ATTACK, HURT. Features: 3-hit combo chain with damage multipliers (1.0x/1.2x/1.5x), input buffering (200ms window), variable-height jump (short press = small jump), dash with i-frames and enemy pass-through, crit system.
- **`Enemy`** (abstract base) — States: IDLE, PATROL, CHASE, ATTACK, HURT, DEAD. Config-driven via `EnemyConfig` interface. Features: mass-based knockback system, attack telegraph (yellow tint for 300ms), squash/stretch on hit, stun state to preserve knockback velocity.
- **`SkeletonEnemy`** — Basic melee enemy (white/default tint)
- **`ArcherEnemy`** — Ranged enemy (blue tint). Maintains preferred distance, fires projectiles. Projectile collision is manually checked in `GameScene.checkProjectileHits()`.
- **`ShieldEnemy`** — Frontal block enemy (gold tint, slightly larger). Shield blocks damage from the front; shield drops after attacking.
- **`FlyingEnemy`** — Aerial enemy (purple tint, smaller). Uses custom `FlyState` (FLOAT/SWOOP/RETURN) alongside base `EnemyState`. Hovers at configurable height, swoops to attack.

### Combat Flow

Attack detection uses **two parallel systems** in `GameScene`:
1. **Phaser overlap callbacks** (`handlePlayerAttackOverlap`, `handleEnemyAttackOverlap`) — triggered by physics system
2. **Distance-based checks** (`checkAttacksByDistance`) — manual distance calculation each frame

Both systems gate on: `isAttacking`, `canDealDamage`, direction check, and `hitEnemiesThisAttack` Set (prevents multi-hit per swing, allows hitting multiple enemies).

Hit effects chain: CameraShake → DamageText → EffectsManager (slash + particles + optional crit flash) → HitStop → knockback + squash/stretch.

### Systems (`src/systems/`)

- **CombatSystem** — Attack detection (distance-based), damage calculation, knockback, crit logic
- **InputController** — Centralized keyboard input (A/D move, K jump, J attack, L dash, I inventory, C stats, P debug)
- **DecorationManager** — Environmental object spawning from `LevelConfig.ts`

### Visual Effects (`src/utils/EffectsManager.ts`)

All effects are procedurally generated using `Phaser.GameObjects.Graphics` (no external sprite assets):
- **Slash effect** — Directional slash lines at hit point, larger/golden for crits
- **Hit particles** — Burst of colored circles on impact
- **Death particles** — Larger explosion with mixed shapes (circles + rectangles)
- **Critical flash** — Full-screen white flash overlay

### UI Components (`src/ui/`)

- **DamageText** — Floating damage numbers (white normal, gold crit)
- **HealthBar** — Entity health bar display
- **PlayerStatsPanel** — Toggle with C key
- **Inventory** — Toggle with I key

### Key Configuration

- `src/config/gameConfig.ts` — Phaser config (960x540, Arcade physics, pixel-art rendering)
- `src/utils/Constants.ts` — **All game tuning parameters**: player stats (health, speed, damage, crit, dash), per-enemy-type configs (skeleton, archer, shield, flying), controls, animation frame counts, scene keys, asset keys, depth layers
- `src/config/LevelConfig.ts` — Decoration placement data
- `vite.config.ts` — Vite + Electron plugin, path alias `@` → `/src`, custom build plugin copies `assets/` to `dist/`

### Physics

Uses Phaser's **Arcade Physics** with gravity (800 px/s²). Static platforms for ground, dynamic bodies for player/enemies. Both player and enemies are set to `pushable = false` to prevent physics-based pushing. Collision types:
- `collider` — Player/enemy vs platforms (physics separation)
- `collider` — Player vs enemies (handles stomp detection only)
- `overlap` — Player vs enemies (attack damage, no physics force)

## Conventions

- Language: TypeScript with strict mode (`noUnusedLocals`, `noUnusedParameters` enabled)
- State management: Enum-based state machines on entities
- Animations: Defined programmatically in BootScene from individual PNG frames (not sprite sheets). Pattern: `assets/{entity}/{action}/{frame}.png`
- Assets: Organized by type under `assets/` (player/, enemy/, backgrounds/, environment/)
- Depth layering: Uses `DEPTH` constants for z-ordering (BACKGROUND:0 → TILEMAP:10 → ENEMIES:20 → PLAYER:30 → EFFECTS:40 → UI:100)
- Path alias: Use `@/` to reference `src/` in imports
- All tuning values belong in `Constants.ts` — never hardcode balance numbers in entity/system code
- New enemy types: extend `Enemy` base class, add config to `ENEMY_CONFIG` in Constants.ts, implement `playAttackAnimation()` and `updateAnimation()` abstract methods
- Comments and variable names are in Chinese (中文) throughout the codebase
