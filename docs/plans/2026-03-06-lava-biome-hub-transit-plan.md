# Lava Biome + Hub Transit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add lava biome (8 rooms, 4 new enemies, 1 boss) and hub transit mechanism (boss defeat -> return to hub -> continue run).

**Architecture:** Extend SaveManager with paused run storage, add pause/resume to RunManager, modify RunScene/HubScene to support mid-run hub visits. New enemies extend existing base classes with tint differentiation. Lava rooms follow same JSON template pattern as cavern rooms.

**Tech Stack:** Phaser 3.86, TypeScript 5.6 strict, JSON room configs, EnemyTable-driven stats.

**No test framework configured** - verify via `npx tsc --noEmit` (zero errors) and `yarn dev` (visual).

---

## Task Overview & Parallelization

```
Group A: Hub Transit (sequential)          Group B: Lava Content (parallel)
  A1: SaveManager paused run               B1: EnemyTable + 4 new entries
  A2: RunManager pause/resume              B2: FireBatEnemy class
  A3: RunScene biome-aware + resume        B3: FireMageEnemy class
  A4: HubScene detect paused run           B4: LavaSlimeEnemy class
                                           B5: MagmaKnightEnemy class
                                           B6: EnemyFactory register
                                           B7: 8 lava room JSONs + index
                                           B8: FireDragonBoss class
                                           B9: BootScene + Constants updates

Integration (after A + B):
  C1: RunScene lava room selection
  C2: TypeScript compile check
  C3: Visual playtest
```

---

## Task A1: SaveManager — Paused Run Storage

**Files:**
- Modify: `src/core/SaveManager.ts`

**Step 1: Add paused run methods to SaveManager**

After line 169 (before closing brace), add:

```typescript
// ===== 暂停运行存储 =====
private static readonly PAUSED_RUN_KEY = 'final-fight-v2-paused-run';

static savePausedRun(runState: Record<string, unknown>): void {
    try {
        localStorage.setItem(this.PAUSED_RUN_KEY, JSON.stringify(runState));
    } catch (e) {
        console.error('[SaveManager] Failed to save paused run', e);
    }
}

static loadPausedRun(): Record<string, unknown> | null {
    try {
        const raw = localStorage.getItem(this.PAUSED_RUN_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('[SaveManager] Failed to load paused run', e);
    }
    return null;
}

static hasPausedRun(): boolean {
    return localStorage.getItem(this.PAUSED_RUN_KEY) !== null;
}

static clearPausedRun(): void {
    localStorage.removeItem(this.PAUSED_RUN_KEY);
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors

---

## Task A2: RunManager — Pause/Resume

**Files:**
- Modify: `src/core/RunManager.ts`

**Step 1: Import SaveManager and add pause/resume methods**

At top of file, add import:
```typescript
import { SaveManager } from './SaveManager';
```

After `endRun()` method (line ~121), add:

```typescript
/** 暂停运行（Boss击败后回据点） */
pauseRun(): void {
    this.state.isRunActive = false;
    SaveManager.savePausedRun(this.state as unknown as Record<string, unknown>);
    console.log('[RunManager] Run paused at biome', this.state.currentBiome);
}

/** 从暂停状态恢复运行 */
static resumeFromPause(): RunManager | null {
    const raw = SaveManager.loadPausedRun();
    if (!raw) return null;

    const manager = new RunManager();
    manager.state = raw as unknown as RunState;
    manager.state.isRunActive = true;
    SaveManager.clearPausedRun();
    console.log('[RunManager] Run resumed at biome', manager.state.currentBiome);
    return manager;
}

/** 检查是否有暂停的运行 */
static hasPausedRun(): boolean {
    return SaveManager.hasPausedRun();
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors

---

## Task A3: RunScene — Biome-Aware + Resume Support

**Files:**
- Modify: `src/scenes/RunScene.ts`

**Step 1: Add lava room imports at top**

After the cavern imports (line 31), add:
```typescript
import { LAVA_COMBAT_ROOMS, LAVA_ELITE_ROOMS, LAVA_BOSS_ROOM } from '@/data/rooms/lava/index';
```

**Step 2: Modify create() to support resume**

In `create()`, after `this.blessingManager = new BlessingManager();` (line 111), add resume detection:

```typescript
// 检查是否从暂停运行恢复
const resumedManager = RunManager.resumeFromPause();
if (resumedManager) {
    this.runManager = resumedManager;
    // 恢复祝福状态
    const blessings = this.runManager.getState().activeBlessings;
    blessings.forEach(id => this.blessingManager.addBlessingById(id));
} else {
    this.runManager = new RunManager();
}
```

Remove the earlier `this.runManager = new RunManager();` line (line 109).

And move `this.runManager.startRun(bonuses.revives);` (line 129) into an else block:
```typescript
if (!resumedManager) {
    this.runManager.startRun(bonuses.revives);
}
```

**Step 3: Modify pickRoom() to be biome-aware**

Replace `pickRoom()` method:

```typescript
private pickRoom(): RoomConfig {
    const biome = this.runManager.getCurrentBiome();
    const roomIndex = this.runManager.getCurrentRoom();

    // 选择当前区域的房间池
    const combatRooms = biome === 0 ? CAVERN_COMBAT_ROOMS : LAVA_COMBAT_ROOMS;
    const eliteRooms = biome === 0 ? CAVERN_ELITE_ROOMS : LAVA_ELITE_ROOMS;

    // 每3个房间出现一次精英房间
    if (roomIndex > 0 && roomIndex % 3 === 0 && eliteRooms.length > 0) {
        return eliteRooms[Phaser.Math.Between(0, eliteRooms.length - 1)];
    }
    return combatRooms[Phaser.Math.Between(0, combatRooms.length - 1)];
}
```

**Step 4: Modify transitionToNextRoom() for biome-aware boss**

Replace the boss room selection in `transitionToNextRoom()`:

```typescript
private transitionToNextRoom(): void {
    const { isBossRoom } = this.runManager.advanceRoom();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
        if (isBossRoom) {
            const biome = this.runManager.getCurrentBiome();
            const bossRoom = biome === 0 ? CAVERN_BOSS_ROOM : LAVA_BOSS_ROOM;
            this.loadRoom(bossRoom);
        } else {
            this.loadRoom(this.pickRoom());
        }
        this.cameras.main.fadeIn(300, 0, 0, 0);
    });
}
```

**Step 5: Modify handleBossDefeated() to pause run and return to hub**

Replace `handleBossDefeated`:

```typescript
private handleBossDefeated = (_data: { bossId: string; bossName: string }): void => {
    this.time.delayedCall(2000, () => {
        const isComplete = this.runManager.advanceBiome();
        if (isComplete) {
            this.handleRunComplete();
        } else {
            // 暂停运行，回到据点休整
            this.runManager.pauseRun();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.roomGenerator.cleanup();
                this.scene.stop(SCENES.UI);
                this.scene.start(SCENES.HUB);
            });
        }
    });
};
```

**Step 6: Modify createParallaxBackground() for biome colors**

Replace background color line:

```typescript
private createParallaxBackground(): void {
    const biome = this.runManager.getCurrentBiome();
    const bgColor = biome === 0 ? '#2a1a3a' : '#3a1a1a'; // 石窟暗紫 / 熔岩暗红
    this.cameras.main.setBackgroundColor(bgColor);
    // ... rest unchanged
```

**Step 7: Update updateRoomInfo() biome names**

Already has biome names array `['石窟', '熔岩']` — no change needed.

**Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: Will fail until lava room imports exist (Task B7). That's OK.

---

## Task A4: HubScene — Detect Paused Run

**Files:**
- Modify: `src/scenes/HubScene.ts`

**Step 1: Import RunManager**

At top of file, add:
```typescript
import { RunManager } from '@/core/RunManager';
```

**Step 2: Add paused run state tracking**

In the class properties (around line 100), add:
```typescript
private hasPausedRun: boolean = false;
```

**Step 3: Detect paused run in create()**

In `create()`, after `this.isTransitioning = false;` (line 119), add:
```typescript
this.hasPausedRun = RunManager.hasPausedRun();
```

**Step 4: Add gate label and heal player**

In `createGate()`, after the '回廊之门' label text (line ~421-429), add dynamic label:

```typescript
// 如果有暂停运行，显示"继续探索"
if (this.hasPausedRun) {
    this.add
        .text(gx, gy + gateHeight / 2 + 16, '▶ 继续探索', {
            fontSize: '11px',
            color: '#ffcc44',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.UI);
}
```

Note: `this.hasPausedRun` is set in `create()` before `createGate()` is called, so the timing is correct.

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors (RunManager import already has the static method)

---

## Task B1: EnemyTable — Add 4 Lava Enemy Entries

**Files:**
- Modify: `src/config/EnemyTable.ts`

**Step 1: Add entries after `bomb_bug` entry (line ~160)**

```typescript
// ===== 熔岩区敌人 =====
fire_bat: {
    id: 'fire_bat',
    name: '火蝠',
    tier: 'normal',
    maxHealth: 30,
    speed: 110,
    attackDamage: 10,
    attackRange: 60,
    attackCooldown: 1800,
    detectRange: 280,
    patrolRange: 130,
    scale: 0.8,
    mass: 0.5,
    knockbackForce: 130,
    collisionWidth: 45,
    collisionHeight: 50,
    offsetX: 37,
    offsetY: 15,
    goldDrop: [3, 7],
    shardDrop: [0, 1],
    extra: {
        floatHeight: 120,
        swoopSpeed: 270,
        fireballDamage: 8,
        fireballSpeed: 200,
        fireballCooldown: 3000,
    },
},
fire_mage: {
    id: 'fire_mage',
    name: '火法师',
    tier: 'normal',
    maxHealth: 35,
    speed: 50,
    attackDamage: 12,
    attackRange: 300,
    attackCooldown: 2800,
    detectRange: 350,
    patrolRange: 60,
    scale: 1.0,
    mass: 0.9,
    knockbackForce: 90,
    collisionWidth: 50,
    collisionHeight: 60,
    offsetX: 35,
    offsetY: 15,
    goldDrop: [5, 12],
    shardDrop: [1, 2],
    extra: {
        preferredDistance: 220,
        minDistance: 150,
        projectileSpeed: 200,
        projectileColor: 0xff4400,
        fireCircleRadius: 40,
        fireCircleDamage: 6,
        fireCircleDuration: 3000,
    },
},
lava_slime: {
    id: 'lava_slime',
    name: '熔岩史莱姆',
    tier: 'normal',
    maxHealth: 40,
    speed: 70,
    attackDamage: 8,
    attackRange: 40,
    attackCooldown: 1500,
    detectRange: 180,
    patrolRange: 80,
    scale: 0.8,
    mass: 1.0,
    knockbackForce: 100,
    collisionWidth: 45,
    collisionHeight: 45,
    offsetX: 27,
    offsetY: 20,
    goldDrop: [2, 5],
    shardDrop: [0, 1],
    extra: {
        splitOnDeath: true,
        splitCount: 2,
        splitHealthRatio: 0.4,
        splitScaleRatio: 0.6,
    },
},
magma_knight: {
    id: 'magma_knight',
    name: '岩浆骑士',
    tier: 'elite',
    maxHealth: 180,
    speed: 70,
    attackDamage: 22,
    attackRange: 60,
    attackCooldown: 1800,
    detectRange: 260,
    patrolRange: 90,
    scale: 1.1,
    mass: 2.5,
    knockbackForce: 50,
    collisionWidth: 50,
    collisionHeight: 60,
    offsetX: 35,
    offsetY: 15,
    goldDrop: [18, 30],
    shardDrop: [4, 7],
    extra: {
        shieldDownDuration: 1500,
        chargeSpeed: 250,
        chargeDamage: 30,
        comboSteps: 3,
    },
},
```

**Step 2: Add fire dragon boss entry (after stone_golem)**

```typescript
fire_dragon: {
    id: 'fire_dragon',
    name: '烈焰龙',
    tier: 'boss',
    maxHealth: 800,
    speed: 60,
    attackDamage: 20,
    attackRange: 80,
    attackCooldown: 2200,
    detectRange: 500,
    patrolRange: 100,
    scale: 2.0,
    mass: 6.0,
    knockbackForce: 20,
    collisionWidth: 70,
    collisionHeight: 80,
    offsetX: 15,
    offsetY: 0,
    goldDrop: [60, 100],
    shardDrop: [12, 20],
    extra: {
        phase2Threshold: 0.6,
        phase3Threshold: 0.3,
        breathDamage: 15,
        breathRange: 180,
        diveDamage: 25,
        diveSpeed: 350,
        fireRainDamage: 10,
        fireRainInterval: 600,
        floatHeight: 140,
        summonCooldown: 8000,
    },
},
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors

---

## Task B2: FireBatEnemy Class

**Files:**
- Create: `src/entities/enemies/FireBatEnemy.ts`

```typescript
/**
 * 火蝠 — 熔岩区飞行敌人
 * 基于 FlyingEnemy 模式：空中漂浮 + 俯冲攻击
 * 外观：骷髅动画 + 橙红 tint + 小体型
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';

enum FlyState {
    FLOAT = 'float',
    SWOOP = 'swoop',
    RETURN = 'return',
}

export class FireBatEnemy extends Enemy {
    private flyState: FlyState = FlyState.FLOAT;
    private floatY: number;
    private swoopTargetY: number = 0;
    private readonly floatHeight: number;
    private readonly swoopSpeed: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.fire_bat;
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: entry.maxHealth,
            speed: entry.speed,
            attackDamage: entry.attackDamage,
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass,
            knockbackForce: entry.knockbackForce,
        });

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 橙红色 tint
        this.setTint(0xff6622);

        // 禁用重力
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.floatHeight = (entry.extra?.floatHeight as number) || 120;
        this.swoopSpeed = (entry.extra?.swoopSpeed as number) || 270;
        this.floatY = y - this.floatHeight;

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }

    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        switch (this.flyState) {
            case FlyState.FLOAT:
                this.maintainFloatHeight(body);

                if (distanceToPlayer <= this.config.detectRange) {
                    this.setFlipX(player.x < this.x);
                    this.currentState = EnemyState.CHASE;
                    const dir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(dir * this.config.speed);

                    if (distanceToPlayer <= this.config.attackRange * 3 && this.canAttack) {
                        this.startSwoop(player);
                    }
                } else {
                    this.currentState = EnemyState.PATROL;
                    this.patrolFloat(body);
                    this.maintainFloatHeight(body);
                }
                break;

            case FlyState.SWOOP:
                body.setVelocityY(this.swoopSpeed);
                {
                    const hDir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(hDir * this.config.speed * 1.5);
                    this.setFlipX(player.x < this.x);

                    if (Math.abs(this.y - player.y) < 40) {
                        this.flyState = FlyState.RETURN;
                        this.attack(player);
                    }
                    if (this.y > this.swoopTargetY + 80) {
                        this.flyState = FlyState.RETURN;
                    }
                }
                break;

            case FlyState.RETURN:
                this.maintainFloatHeight(body, true);
                if (Math.abs(this.y - this.floatY) < 20) {
                    this.flyState = FlyState.FLOAT;
                    body.setVelocityY(0);
                }
                break;
        }
    }

    private maintainFloatHeight(body: Phaser.Physics.Arcade.Body, fast = false): void {
        const yDiff = this.floatY - this.y;
        const speed = fast ? 8 : 4;
        body.setVelocityY(
            Phaser.Math.Clamp(yDiff * speed, -this.swoopSpeed, this.swoopSpeed),
        );
    }

    private startSwoop(player: Player): void {
        this.flyState = FlyState.SWOOP;
        this.swoopTargetY = player.y;
        this.canAttack = false;
        this.scene.time.delayedCall(this.config.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    private patrolFloat(body: Phaser.Physics.Arcade.Body): void {
        if (this.x > this.patrolStartX + this.config.patrolRange) {
            this.patrolDirection = -1;
        } else if (this.x < this.patrolStartX - this.config.patrolRange) {
            this.patrolDirection = 1;
        }
        body.setVelocityX(this.config.speed * 0.4 * this.patrolDirection);
        this.setFlipX(this.patrolDirection < 0);
    }
}
```

---

## Task B3: FireMageEnemy Class

**Files:**
- Create: `src/entities/enemies/FireMageEnemy.ts`

```typescript
/**
 * 火法师 — 熔岩区远程敌人
 * 基于 ArcherEnemy 模式：保持距离 + 发射火球
 * 外观：骷髅动画 + 红色 tint
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';

export class FireMageEnemy extends Enemy {
    public projectiles: Phaser.Physics.Arcade.Sprite[] = [];
    private readonly preferredDistance: number;
    private readonly minDistance: number;
    private readonly projectileSpeed: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.fire_mage;
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: entry.maxHealth,
            speed: entry.speed,
            attackDamage: entry.attackDamage,
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass,
            knockbackForce: entry.knockbackForce,
        });

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 红色 tint
        this.setTint(0xff3300);

        this.preferredDistance = (entry.extra?.preferredDistance as number) || 220;
        this.minDistance = (entry.extra?.minDistance as number) || 150;
        this.projectileSpeed = (entry.extra?.projectileSpeed as number) || 200;

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }

    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (distanceToPlayer > this.config.detectRange) {
            this.currentState = EnemyState.PATROL;
            this.patrol();
            return;
        }

        this.setFlipX(player.x < this.x);
        this.currentState = EnemyState.CHASE;

        // 保持距离
        if (distanceToPlayer < this.minDistance) {
            const fleeDir = this.x > player.x ? 1 : -1;
            body.setVelocityX(fleeDir * this.config.speed);
        } else if (distanceToPlayer > this.preferredDistance) {
            const chaseDir = player.x > this.x ? 1 : -1;
            body.setVelocityX(chaseDir * this.config.speed * 0.7);
        } else {
            body.setVelocityX(0);
        }

        // 攻击
        if (distanceToPlayer <= this.config.attackRange && this.canAttack) {
            this.fireProjectile(player);
        }
    }

    private fireProjectile(player: Player): void {
        this.canAttack = false;
        this.isAttacking = true;
        this.playAttackAnimation();

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        this.once('animationcomplete', () => {
            if (this.isDead) return;
            this.isAttacking = false;

            // 创建火球
            const fireball = this.scene.physics.add.sprite(this.x, this.y - 10, `${ASSETS.TILESET_GRASS}-1`);
            fireball.setScale(0.4);
            fireball.setTint(0xff4400);
            fireball.setDepth(DEPTH.EFFECTS);

            const fbBody = fireball.body as Phaser.Physics.Arcade.Body;
            fbBody.setAllowGravity(false);
            const dirX = player.x - this.x;
            const dirY = player.y - this.y;
            const angle = Math.atan2(dirY, dirX);
            fbBody.setVelocityX(Math.cos(angle) * this.projectileSpeed);
            fbBody.setVelocityY(Math.sin(angle) * this.projectileSpeed);

            this.projectiles.push(fireball);

            // 超时销毁
            this.scene.time.delayedCall(4000, () => {
                this.destroyProjectile(fireball);
            });

            this.scene.time.delayedCall(this.config.attackCooldown, () => {
                this.canAttack = true;
            });
        });
    }

    public destroyProjectile(proj: Phaser.Physics.Arcade.Sprite): void {
        const index = this.projectiles.indexOf(proj);
        if (index !== -1) this.projectiles.splice(index, 1);
        if (proj.active) proj.destroy();
    }
}
```

---

## Task B4: LavaSlimeEnemy Class

**Files:**
- Create: `src/entities/enemies/LavaSlimeEnemy.ts`

```typescript
/**
 * 熔岩史莱姆 — 死亡后分裂成2个小史莱姆
 * 外观：骷髅动画 + 橙色 tint + 小体型
 */
import { Enemy, EnemyState } from '../Enemy';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';
import { EffectsManager } from '@/utils/EffectsManager';

export class LavaSlimeEnemy extends Enemy {
    /** 是否为分裂产生的小史莱姆（小史莱姆死亡不再分裂） */
    private readonly isSplit: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, isSplit = false) {
        const entry = ENEMY_TABLE.lava_slime;
        const healthMult = isSplit ? (entry.extra?.splitHealthRatio as number || 0.4) : 1;
        const scaleMult = isSplit ? (entry.extra?.splitScaleRatio as number || 0.6) : 1;

        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: Math.round(entry.maxHealth * healthMult),
            speed: entry.speed * (isSplit ? 1.3 : 1),
            attackDamage: Math.round(entry.attackDamage * (isSplit ? 0.6 : 1)),
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass * (isSplit ? 0.5 : 1),
            knockbackForce: entry.knockbackForce,
        });

        this.isSplit = isSplit;
        this.setScale(entry.scale * scaleMult);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 橙色 tint
        this.setTint(0xff8800);

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        switch (this.currentState) {
            case EnemyState.PATROL:
            case EnemyState.CHASE:
                if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
                    this.play('skeleton-walk', true);
                }
                break;
            case EnemyState.IDLE:
            default:
                if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
                    this.play('skeleton-idle', true);
                }
                break;
        }
    }

    protected die(): void {
        if (!this.isSplit) {
            this.splitIntoSmall();
        }
        super.die();
    }

    private splitIntoSmall(): void {
        const splitCount = (ENEMY_TABLE.lava_slime.extra?.splitCount as number) || 2;
        for (let i = 0; i < splitCount; i++) {
            const offsetX = (i === 0 ? -30 : 30);
            const small = new LavaSlimeEnemy(this.scene, this.x + offsetX, this.y, true);
            small.setDepth(DEPTH.ENEMIES);

            // 通知 RunScene 将小史莱姆加入敌人组
            this.scene.events.emit('enemy-spawned', small);
        }
    }
}
```

---

## Task B5: MagmaKnightEnemy Class

**Files:**
- Create: `src/entities/enemies/MagmaKnightEnemy.ts`

```typescript
/**
 * 岩浆骑士 — 熔岩区精英敌人
 * 基于 ShieldEnemy 模式：正面格挡 + 冲锋 + 三段斩
 * 外观：骷髅动画 + 深红 tint + 大体型
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';

export class MagmaKnightEnemy extends Enemy {
    public isShielding: boolean = true;
    private shieldDownTimer?: Phaser.Time.TimerEvent;
    private readonly shieldDownDuration: number;
    private comboStep: number = 0;
    private readonly maxComboSteps: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.magma_knight;
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: entry.maxHealth,
            speed: entry.speed,
            attackDamage: entry.attackDamage,
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass,
            knockbackForce: entry.knockbackForce,
        });

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 深红色 tint
        this.setTint(0xaa2200);

        this.shieldDownDuration = (entry.extra?.shieldDownDuration as number) || 1500;
        this.maxComboSteps = (entry.extra?.comboSteps as number) || 3;

        this.play('skeleton-idle');
    }

    /**
     * 重写受伤：正面格挡减半伤害
     */
    public takeDamage(damage: number, knockbackDirection?: number): void {
        if (this.isShielding && knockbackDirection !== undefined) {
            // 正面格挡：攻击来自面朝方向
            const isFrontAttack = this.flipX
                ? knockbackDirection > 0  // 面朝左，攻击从左来
                : knockbackDirection < 0; // 面朝右，攻击从右来
            if (isFrontAttack) {
                damage = Math.round(damage * 0.3);
            }
        }
        super.takeDamage(damage, knockbackDirection);
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }

    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (distanceToPlayer > this.config.detectRange) {
            this.currentState = EnemyState.PATROL;
            this.patrol();
            return;
        }

        this.setFlipX(player.x < this.x);
        this.currentState = EnemyState.CHASE;

        if (distanceToPlayer <= this.config.attackRange && this.canAttack) {
            this.performComboAttack(player);
        } else {
            body.setVelocityX(
                (player.x > this.x ? 1 : -1) * this.config.speed,
            );
        }
    }

    private performComboAttack(_player: Player): void {
        this.canAttack = false;
        this.isShielding = false;
        this.isAttacking = true;
        this.comboStep++;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        this.playAttackAnimation();

        this.once('animationcomplete', () => {
            if (this.isDead) return;
            this.isAttacking = false;

            if (this.comboStep < this.maxComboSteps) {
                // 连击中间短暂间隔
                this.scene.time.delayedCall(300, () => {
                    this.canAttack = true;
                });
            } else {
                // 连击结束，盾牌放下一段时间
                this.comboStep = 0;
                this.shieldDownTimer = this.scene.time.delayedCall(this.shieldDownDuration, () => {
                    this.isShielding = true;
                });
                this.scene.time.delayedCall(this.config.attackCooldown, () => {
                    this.canAttack = true;
                });
            }
        });
    }
}
```

---

## Task B6: EnemyFactory — Register New Enemies

**Files:**
- Modify: `src/entities/EnemyFactory.ts`

**Step 1: Add imports after existing enemy imports**

```typescript
import { FireBatEnemy } from './enemies/FireBatEnemy';
import { FireMageEnemy } from './enemies/FireMageEnemy';
import { LavaSlimeEnemy } from './enemies/LavaSlimeEnemy';
import { MagmaKnightEnemy } from './enemies/MagmaKnightEnemy';
import { FireDragonBoss } from './bosses/FireDragonBoss';
```

**Step 2: Add to ENEMY_REGISTRY**

```typescript
const ENEMY_REGISTRY: Record<string, EnemyConstructor> = {
    skeleton: SkeletonEnemy,
    archer: ArcherEnemy,
    shield: ShieldEnemy,
    flying: FlyingEnemy,
    bomb_bug: BombBugEnemy,
    elite_skeleton: EliteSkeletonEnemy,
    lava_golem: LavaGolemEnemy,
    stone_golem: StoneGolemBoss,
    // 熔岩区
    fire_bat: FireBatEnemy,
    fire_mage: FireMageEnemy,
    lava_slime: LavaSlimeEnemy,
    magma_knight: MagmaKnightEnemy,
    fire_dragon: FireDragonBoss,
};
```

Note: `LavaSlimeEnemy` constructor has optional `isSplit` param, default `false`, so `EnemyConstructor` type matches.

---

## Task B7: Lava Room Templates + Index

**Files:**
- Create: `src/data/rooms/lava/` directory
- Create: 8 JSON files + `index.ts`

**Step 1: Create directory**

```bash
mkdir -p src/data/rooms/lava
```

**Step 2: Create room JSONs**

`src/data/rooms/lava/combat-flat-01.json`:
```json
{
    "id": "lava-combat-flat-01",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 1440, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [],
    "spawns": [
        { "type": "lava_slime", "x": 400, "y": 380 },
        { "type": "lava_slime", "x": 600, "y": 380 },
        { "type": "fire_mage", "x": 1100, "y": 380 }
    ],
    "hazards": [
        { "type": "lava", "x": 0, "y": 520, "width": 200, "height": 20 },
        { "type": "lava", "x": 1240, "y": 520, "width": 200, "height": 20 }
    ],
    "exits": [
        { "position": "right", "x": 1410, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-flat-02.json`:
```json
{
    "id": "lava-combat-flat-02",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 960, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [],
    "spawns": [
        { "type": "fire_bat", "x": 500, "y": 300 },
        { "type": "lava_slime", "x": 600, "y": 380 },
        { "type": "lava_slime", "x": 750, "y": 380 }
    ],
    "hazards": [
        { "type": "lava", "x": 380, "y": 520, "width": 100, "height": 20 }
    ],
    "exits": [
        { "position": "right", "x": 930, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-platforms-01.json`:
```json
{
    "id": "lava-combat-platforms-01",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 1200, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 350, "y": 400, "tileCount": 5 },
        { "x": 700, "y": 340, "tileCount": 5 },
        { "x": 1000, "y": 400, "tileCount": 4 }
    ],
    "spawns": [
        { "type": "fire_bat", "x": 400, "y": 280 },
        { "type": "fire_mage", "x": 750, "y": 260 },
        { "type": "lava_slime", "x": 1050, "y": 380 }
    ],
    "hazards": [],
    "exits": [
        { "position": "right", "x": 1170, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-platforms-02.json`:
```json
{
    "id": "lava-combat-platforms-02",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 1200, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 250, "y": 420, "tileCount": 4 },
        { "x": 500, "y": 360, "tileCount": 4 },
        { "x": 750, "y": 300, "tileCount": 4 },
        { "x": 1000, "y": 360, "tileCount": 4 }
    ],
    "spawns": [
        { "type": "lava_slime", "x": 300, "y": 340 },
        { "type": "fire_bat", "x": 600, "y": 240 },
        { "type": "fire_mage", "x": 900, "y": 220 }
    ],
    "hazards": [],
    "exits": [
        { "position": "right", "x": 1170, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-corridor-01.json`:
```json
{
    "id": "lava-combat-corridor-01",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 1440, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 500, "y": 420, "tileCount": 3 }
    ],
    "spawns": [
        { "type": "lava_slime", "x": 350, "y": 380 },
        { "type": "fire_bat", "x": 700, "y": 300 },
        { "type": "lava_slime", "x": 900, "y": 380 },
        { "type": "fire_mage", "x": 1200, "y": 380 }
    ],
    "hazards": [
        { "type": "lava", "x": 580, "y": 520, "width": 80, "height": 20 },
        { "type": "lava", "x": 1000, "y": 520, "width": 80, "height": 20 }
    ],
    "exits": [
        { "position": "right", "x": 1410, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-corridor-02.json`:
```json
{
    "id": "lava-combat-corridor-02",
    "biome": "lava",
    "type": "combat",
    "size": { "width": 1440, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 400, "y": 360, "tileCount": 3 },
        { "x": 900, "y": 360, "tileCount": 3 }
    ],
    "spawns": [
        { "type": "lava_slime", "x": 300, "y": 380 },
        { "type": "fire_mage", "x": 450, "y": 280 },
        { "type": "lava_slime", "x": 700, "y": 380 },
        { "type": "fire_bat", "x": 1100, "y": 280 }
    ],
    "hazards": [],
    "exits": [
        { "position": "right", "x": 1410, "y": 440 }
    ]
}
```

`src/data/rooms/lava/combat-elite-01.json`:
```json
{
    "id": "lava-combat-elite-01",
    "biome": "lava",
    "type": "elite",
    "size": { "width": 1200, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 400, "y": 380, "tileCount": 4 },
        { "x": 800, "y": 380, "tileCount": 4 }
    ],
    "spawns": [
        { "type": "magma_knight", "x": 600, "y": 380 },
        { "type": "fire_bat", "x": 900, "y": 280 }
    ],
    "hazards": [],
    "exits": [
        { "position": "right", "x": 1170, "y": 440 }
    ]
}
```

`src/data/rooms/lava/boss-fire-dragon.json`:
```json
{
    "id": "lava-boss-fire-dragon",
    "biome": "lava",
    "type": "boss",
    "size": { "width": 1600, "height": 540 },
    "playerSpawn": { "x": 100, "y": 380 },
    "groundY": 508,
    "platforms": [
        { "x": 400, "y": 380, "tileCount": 6 },
        { "x": 800, "y": 300, "tileCount": 4 },
        { "x": 1200, "y": 380, "tileCount": 6 }
    ],
    "spawns": [
        { "type": "fire_dragon", "x": 1000, "y": 380 }
    ],
    "hazards": [
        { "type": "lava", "x": 0, "y": 520, "width": 300, "height": 20 },
        { "type": "lava", "x": 1300, "y": 520, "width": 300, "height": 20 }
    ],
    "exits": [
        { "position": "right", "x": 1570, "y": 440 }
    ]
}
```

**Step 3: Create index.ts**

`src/data/rooms/lava/index.ts`:
```typescript
/**
 * 熔岩区域房间模板索引
 */
import type { RoomConfig } from '@/config/RoomConfig';
import combatFlat01 from './combat-flat-01.json';
import combatFlat02 from './combat-flat-02.json';
import combatPlatforms01 from './combat-platforms-01.json';
import combatPlatforms02 from './combat-platforms-02.json';
import combatCorridor01 from './combat-corridor-01.json';
import combatCorridor02 from './combat-corridor-02.json';
import combatElite01 from './combat-elite-01.json';
import bossFireDragon from './boss-fire-dragon.json';

/** 所有熔岩战斗房间模板 */
export const LAVA_COMBAT_ROOMS: RoomConfig[] = [
    combatFlat01 as RoomConfig,
    combatFlat02 as RoomConfig,
    combatPlatforms01 as RoomConfig,
    combatPlatforms02 as RoomConfig,
    combatCorridor01 as RoomConfig,
    combatCorridor02 as RoomConfig,
];

/** 熔岩精英房间模板 */
export const LAVA_ELITE_ROOMS: RoomConfig[] = [
    combatElite01 as RoomConfig,
];

/** 熔岩 Boss 房间 */
export const LAVA_BOSS_ROOM: RoomConfig = bossFireDragon as RoomConfig;
```

---

## Task B8: FireDragonBoss Class

**Files:**
- Create: `src/entities/bosses/FireDragonBoss.ts`

```typescript
/**
 * 烈焰龙 — 熔岩区域 Boss
 *
 * 3阶段:
 * Phase 1 (100%~60%): 地面走动 + 火焰吐息(扇形AoE) + 尾扫
 * Phase 2 (60%~30%):  飞到空中 + 俯冲攻击 + 召唤 fire_bat
 * Phase 3 (30%~0%):   狂暴交替地面/空中 + 火雨覆盖
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';
import { EffectsManager } from '@/utils/EffectsManager';

enum DragonPhase {
    PHASE_1,
    PHASE_2,
    PHASE_3,
}

enum DragonAttackType {
    BREATH,     // 火焰吐息
    TAIL_SWIPE, // 尾扫
    DIVE,       // 俯冲
    SUMMON,     // 召唤
    FIRE_RAIN,  // 火雨
}

export class FireDragonBoss extends Enemy {
    private bossPhase: DragonPhase = DragonPhase.PHASE_1;
    private readonly phase2Threshold: number;
    private readonly phase3Threshold: number;
    private readonly breathDamage: number;
    private readonly breathRange: number;
    private readonly diveDamage: number;
    private readonly diveSpeed: number;
    private readonly fireRainDamage: number;
    private readonly floatHeight: number;

    private attackPattern: DragonAttackType[] = [];
    private attackPatternIndex: number = 0;
    private isTransitioning: boolean = false;
    private isFlying: boolean = false;
    private groundY: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.fire_dragon;
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: entry.maxHealth,
            speed: entry.speed,
            attackDamage: entry.attackDamage,
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass,
            knockbackForce: entry.knockbackForce,
        });

        const extra = entry.extra || {};
        this.phase2Threshold = (extra.phase2Threshold as number) || 0.6;
        this.phase3Threshold = (extra.phase3Threshold as number) || 0.3;
        this.breathDamage = (extra.breathDamage as number) || 15;
        this.breathRange = (extra.breathRange as number) || 180;
        this.diveDamage = (extra.diveDamage as number) || 25;
        this.diveSpeed = (extra.diveSpeed as number) || 350;
        this.fireRainDamage = (extra.fireRainDamage as number) || 10;
        this.floatHeight = (extra.floatHeight as number) || 140;

        this.groundY = y;
        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 红色龙
        this.setTint(0xff2200);

        this.buildAttackPattern();
        this.play('skeleton-idle');
    }

    private buildAttackPattern(): void {
        switch (this.bossPhase) {
            case DragonPhase.PHASE_1:
                this.attackPattern = [
                    DragonAttackType.BREATH,
                    DragonAttackType.TAIL_SWIPE,
                    DragonAttackType.BREATH,
                ];
                break;
            case DragonPhase.PHASE_2:
                this.attackPattern = [
                    DragonAttackType.DIVE,
                    DragonAttackType.BREATH,
                    DragonAttackType.SUMMON,
                    DragonAttackType.DIVE,
                ];
                break;
            case DragonPhase.PHASE_3:
                this.attackPattern = [
                    DragonAttackType.FIRE_RAIN,
                    DragonAttackType.DIVE,
                    DragonAttackType.BREATH,
                    DragonAttackType.TAIL_SWIPE,
                    DragonAttackType.FIRE_RAIN,
                ];
                break;
        }
        this.attackPatternIndex = 0;
    }

    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned || this.isTransitioning) return;

        this.checkPhaseTransition();

        const body = this.body as Phaser.Physics.Arcade.Body;

        // Phase 2+ 空中行为
        if (this.isFlying) {
            const targetY = this.groundY - this.floatHeight;
            const yDiff = targetY - this.y;
            body.setVelocityY(Phaser.Math.Clamp(yDiff * 4, -200, 200));
        }

        if (distanceToPlayer <= this.getEffectiveRange()) {
            this.performNextAttack(player);
        } else if (distanceToPlayer <= this.config.detectRange) {
            this.currentState = EnemyState.CHASE;
            const speed = this.getPhaseSpeed();
            if (player.x < this.x) {
                this.setFlipX(true);
                body.setVelocityX(-speed);
            } else {
                this.setFlipX(false);
                body.setVelocityX(speed);
            }
        } else {
            this.currentState = EnemyState.IDLE;
            body.setVelocityX(0);
        }
    }

    private getPhaseSpeed(): number {
        switch (this.bossPhase) {
            case DragonPhase.PHASE_1: return this.config.speed;
            case DragonPhase.PHASE_2: return this.config.speed * 1.3;
            case DragonPhase.PHASE_3: return this.config.speed * 1.6;
        }
    }

    private getEffectiveRange(): number {
        const nextAttack = this.attackPattern[this.attackPatternIndex];
        switch (nextAttack) {
            case DragonAttackType.BREATH: return this.breathRange;
            case DragonAttackType.TAIL_SWIPE: return this.config.attackRange;
            case DragonAttackType.DIVE: return 300;
            case DragonAttackType.SUMMON: return 400;
            case DragonAttackType.FIRE_RAIN: return 500;
            default: return this.config.attackRange;
        }
    }

    private checkPhaseTransition(): void {
        const healthPercent = this.health / this.maxHealth;
        if (this.bossPhase === DragonPhase.PHASE_1 && healthPercent <= this.phase2Threshold) {
            this.transitionToPhase(DragonPhase.PHASE_2);
        } else if (this.bossPhase === DragonPhase.PHASE_2 && healthPercent <= this.phase3Threshold) {
            this.transitionToPhase(DragonPhase.PHASE_3);
        }
    }

    private transitionToPhase(phase: DragonPhase): void {
        this.isTransitioning = true;
        this.bossPhase = phase;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        this.setTint(0xffffff);
        this.scene.cameras.main.shake(500, 0.015);

        // Phase 2 起飞
        if (phase === DragonPhase.PHASE_2) {
            body.setAllowGravity(false);
            this.isFlying = true;
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.scaleX * 1.1,
            scaleY: this.scaleY * 1.1,
            duration: 300,
            yoyo: true,
            onComplete: () => {
                const phaseColors: Record<DragonPhase, number> = {
                    [DragonPhase.PHASE_1]: 0xff2200,
                    [DragonPhase.PHASE_2]: 0xff6600,
                    [DragonPhase.PHASE_3]: 0xffaa00,
                };
                this.setTint(phaseColors[phase]);
                this.isTransitioning = false;
                this.buildAttackPattern();

                this.scene.events.emit('boss-phase-change', {
                    phase: phase,
                    bossName: ENEMY_TABLE.fire_dragon.name,
                });
            },
        });
    }

    private performNextAttack(player: Player): void {
        if (!this.canAttack) return;

        const attackType = this.attackPattern[this.attackPatternIndex];
        this.attackPatternIndex = (this.attackPatternIndex + 1) % this.attackPattern.length;

        this.setFlipX(player.x < this.x);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        switch (attackType) {
            case DragonAttackType.BREATH: this.performBreath(player); break;
            case DragonAttackType.TAIL_SWIPE: this.performTailSwipe(player); break;
            case DragonAttackType.DIVE: this.performDive(player); break;
            case DragonAttackType.SUMMON: this.performSummon(); break;
            case DragonAttackType.FIRE_RAIN: this.performFireRain(); break;
        }
    }

    // ===== 攻击实现 =====

    private performBreath(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;
        this.setTint(0xffaa00);

        this.scene.time.delayedCall(600, () => {
            if (this.isDead) return;
            this.isPreparing = false;
            this.isAttacking = true;
            this.setTint(this.getPhaseColor());
            this.playAttackAnimation();

            // 火焰吐息视觉
            const dir = this.flipX ? -1 : 1;
            const breathX = this.x + dir * 60;
            const breathCircle = this.scene.add.circle(breathX, this.y, this.breathRange, 0xff4400, 0.3);
            breathCircle.setDepth(DEPTH.EFFECTS);
            this.scene.tweens.add({
                targets: breathCircle,
                alpha: 0,
                scaleX: 1.3,
                scaleY: 0.4,
                duration: 500,
                onComplete: () => breathCircle.destroy(),
            });

            // 伤害事件
            this.scene.events.emit('boss-quake', {
                x: breathX,
                y: this.y,
                damage: this.breathDamage,
                range: this.breathRange,
            });

            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;
            });

            this.scene.time.delayedCall(this.config.attackCooldown, () => {
                this.canAttack = true;
            });
        });
    }

    private performTailSwipe(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;
        this.setTint(0xff8800);

        this.scene.time.delayedCall(400, () => {
            if (this.isDead) return;
            this.isPreparing = false;
            this.isAttacking = true;
            this.setTint(this.getPhaseColor());
            this.playAttackAnimation();

            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;
            });

            this.scene.time.delayedCall(this.config.attackCooldown * 0.8, () => {
                this.canAttack = true;
            });
        });
    }

    private performDive(player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;
        this.setTint(0xff0000);

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 飞到高空
        body.setVelocityY(-200);

        this.scene.time.delayedCall(600, () => {
            if (this.isDead) return;
            this.isPreparing = false;
            this.isAttacking = true;

            // 俯冲向玩家
            const dirX = player.x - this.x;
            const dirY = player.y - this.y;
            const angle = Math.atan2(dirY, dirX);
            body.setVelocityX(Math.cos(angle) * this.diveSpeed);
            body.setVelocityY(Math.sin(angle) * this.diveSpeed);

            // 俯冲超时
            this.scene.time.delayedCall(800, () => {
                if (this.isDead) return;
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;
                this.setTint(this.getPhaseColor());
                body.setVelocityX(0);

                // 俯冲落地伤害
                this.scene.events.emit('boss-quake', {
                    x: this.x,
                    y: this.y,
                    damage: this.diveDamage,
                    range: 120,
                });
                this.scene.cameras.main.shake(200, 0.01);

                this.scene.time.delayedCall(this.config.attackCooldown, () => {
                    this.canAttack = true;
                });
            });
        });
    }

    private performSummon(): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;
        this.setTint(0xffcc00);

        this.scene.time.delayedCall(800, () => {
            if (this.isDead) return;
            this.isPreparing = false;
            this.setTint(this.getPhaseColor());

            // 召唤2只火蝠
            for (let i = 0; i < 2; i++) {
                const offsetX = i === 0 ? -80 : 80;
                this.scene.events.emit('boss-summon', {
                    type: 'fire_bat',
                    x: this.x + offsetX,
                    y: this.y - 60,
                });
            }

            this.currentState = EnemyState.IDLE;
            this.scene.time.delayedCall(this.config.attackCooldown * 2, () => {
                this.canAttack = true;
            });
        });
    }

    private performFireRain(): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;
        this.setTint(0xffff00);

        this.scene.time.delayedCall(800, () => {
            if (this.isDead) return;
            this.isPreparing = false;
            this.setTint(this.getPhaseColor());

            // 5次火雨落点
            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(i * 400, () => {
                    if (this.isDead) return;
                    const rainX = Phaser.Math.Between(100, 1500);

                    // 预警标记
                    const warning = this.scene.add.circle(rainX, 490, 30, 0xff0000, 0.3);
                    warning.setDepth(DEPTH.EFFECTS);

                    this.scene.time.delayedCall(500, () => {
                        warning.destroy();
                        // 火雨伤害
                        const fireCircle = this.scene.add.circle(rainX, 490, 40, 0xff4400, 0.5);
                        fireCircle.setDepth(DEPTH.EFFECTS);
                        this.scene.tweens.add({
                            targets: fireCircle,
                            alpha: 0,
                            duration: 400,
                            onComplete: () => fireCircle.destroy(),
                        });

                        this.scene.events.emit('boss-quake', {
                            x: rainX,
                            y: 490,
                            damage: this.fireRainDamage,
                            range: 50,
                        });
                    });
                });
            }

            this.currentState = EnemyState.IDLE;
            this.scene.time.delayedCall(3000, () => {
                this.canAttack = true;
            });
        });
    }

    private getPhaseColor(): number {
        switch (this.bossPhase) {
            case DragonPhase.PHASE_1: return 0xff2200;
            case DragonPhase.PHASE_2: return 0xff6600;
            case DragonPhase.PHASE_3: return 0xffaa00;
        }
    }

    protected die(): void {
        this.isDead = true;
        this.currentState = EnemyState.DEAD;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.enable = false;

        this.scene.time.timeScale = 0.3;

        for (let i = 0; i < 7; i++) {
            this.scene.time.delayedCall(i * 200, () => {
                const offsetX = Phaser.Math.Between(-40, 40);
                const offsetY = Phaser.Math.Between(-50, 10);
                EffectsManager.createDeathParticles(this.scene, this.x + offsetX, this.y + offsetY);
            });
        }

        this.scene.time.delayedCall(1600, () => {
            this.scene.cameras.main.shake(600, 0.04);
            EffectsManager.createDeathParticles(this.scene, this.x, this.y);
            this.scene.time.timeScale = 1;

            this.scene.events.emit('boss-defeated', {
                bossId: 'fire_dragon',
                bossName: ENEMY_TABLE.fire_dragon.name,
            });

            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                duration: 800,
                onComplete: () => this.destroy(),
            });
        });
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead || this.isTransitioning) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }
}
```

---

## Task B9: RunScene — Handle Lava Slime Split + Boss Summon

**Files:**
- Modify: `src/scenes/RunScene.ts`

**Step 1: Add enemy-spawned and boss-summon event handlers**

In `create()`, after the `boss-defeated` event listener (line ~152), add:

```typescript
// 监听动态敌人生成（史莱姆分裂、Boss召唤等）
this.events.on('enemy-spawned', this.handleEnemySpawned, this);
this.events.on('boss-summon', this.handleBossSummon, this);
```

Also add cleanup in the event cleanup section at the top of `create()`:
```typescript
this.events.off('enemy-spawned', this.handleEnemySpawned, this);
this.events.off('boss-summon', this.handleBossSummon, this);
```

**Step 2: Add handler methods**

```typescript
/** 处理动态敌人生成（史莱姆分裂） */
private handleEnemySpawned = (enemy: Enemy): void => {
    if (!this.enemies) return;
    this.enemies.add(enemy);
    enemy.setCollideWorldBounds(true);
    // 与平台碰撞
    this.physics.add.collider(enemy, this.platforms);
};

/** 处理 Boss 召唤小怪 */
private handleBossSummon = (data: { type: string; x: number; y: number }): void => {
    if (!this.enemies) return;
    const enemy = EnemyFactory.create(data.type, this, data.x, data.y);
    enemy.setDepth(DEPTH.ENEMIES);
    this.enemies.add(enemy);
    enemy.setCollideWorldBounds(true);
    this.physics.add.collider(enemy, this.platforms);
};
```

Add import for `EnemyFactory` if not already present (check line 21 area — it's already imported via RoomGenerator indirectly, but add explicit import):
```typescript
import { EnemyFactory } from '@/entities/EnemyFactory';
```

**Step 3: Handle fire mage projectiles in checkProjectileHits**

After the existing archer projectile check block, add fire mage check. Since `FireMageEnemy` has same `projectiles` + `destroyProjectile` interface as `ArcherEnemy`, we can extend the existing check:

In `checkProjectileHits()`, after the ArcherEnemy block, add:

```typescript
// 火法师投射物检测
const { FireMageEnemy } = await import('@/entities/enemies/FireMageEnemy');
```

Actually, to avoid async imports, use a simpler approach — check for `projectiles` property on any enemy:

Replace the `checkProjectileHits` method to also handle fire mage:

Add import at top:
```typescript
import { FireMageEnemy } from '@/entities/enemies/FireMageEnemy';
```

In `checkProjectileHits()`, after the ArcherEnemy for-loop, add a similar block for FireMageEnemy:

```typescript
const mage = enemy as unknown as FireMageEnemy;
if (!(mage instanceof FireMageEnemy) || mage.isDead) return;

for (const proj of [...mage.projectiles]) {
    if (!proj.active) {
        mage.destroyProjectile(proj);
        continue;
    }
    const worldWidth = this.currentRoomConfig.size.width;
    if (proj.x < 0 || proj.x > worldWidth || proj.y < 0 || proj.y > GAME_HEIGHT + 100) {
        mage.destroyProjectile(proj);
        continue;
    }
    const dx = Math.abs(proj.x - this.player.x);
    const dy = Math.abs(proj.y - this.player.y);
    if (dx < 30 && dy < 35) {
        const projDmgReduction = this.blessingManager.getDamageReduction();
        const projReducedDamage = Math.round(mage.attackDamage * (1 - projDmgReduction));
        CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
        DamageText.create(this, this.player.x, this.player.y - 30, projReducedDamage, DamageType.NORMAL);
        const knockDir = proj.body
            ? (proj.body as Phaser.Physics.Arcade.Body).velocity.x > 0 ? -1 : 1
            : 0;
        this.player.takeDamage(projReducedDamage, knockDir);
        mage.destroyProjectile(proj);
        this.runManager.addDamageTaken(projReducedDamage);
    }
}
```

---

## Task C1: Integration — Tint Ground Tiles for Lava Biome

**Files:**
- Modify: `src/core/RoomGenerator.ts`

**Step 1: Accept biome parameter and tint lava ground**

In `RoomGenerator.createGround()`, add tinting for lava biome:

After `ground.setScale(0.5);` (line 68), add:
```typescript
if (config.biome === 'lava') {
    ground.setTint(0xff6644);
}
```

Similarly in `createPlatform()`, after `tile.setScale(0.5);` (line 86), add:
```typescript
// 获取当前房间biome信息（通过最后一次generate的config）
```

Actually, simpler: store the current config in the generator.

Add a property:
```typescript
private currentConfig: RoomConfig | null = null;
```

In `generate()`, before cleanup:
```typescript
this.currentConfig = config;
```

In `createPlatform()`, after `tile.setScale(0.5);`:
```typescript
if (this.currentConfig?.biome === 'lava') {
    (tile as Phaser.Physics.Arcade.Sprite).setTint(0xff6644);
}
```

---

## Task C2: TypeScript Compile Check

Run: `npx tsc --noEmit`
Expected: Zero errors

Fix any type errors that arise.

---

## Task C3: Visual Playtest

Run: `yarn dev`

Test checklist:
1. Start new run from Hub → play through cavern rooms → defeat stone golem boss
2. Verify: returns to Hub after boss defeat (not next biome directly)
3. Verify: Hub shows "继续探索" on gate
4. Enter gate → verify lava biome loads (red-tinted ground, lava hazards)
5. Fight through lava rooms → encounter lava slime (verify split on death)
6. Encounter fire mage (verify projectiles)
7. Encounter fire bat (verify flying behavior)
8. Elite room → magma knight (verify shield + combo)
9. Boss room → fire dragon (verify 3 phases)
10. Defeat fire dragon → verify WinScene

---

## Commit Strategy

```bash
# After Group A complete:
git add src/core/SaveManager.ts src/core/RunManager.ts src/scenes/RunScene.ts src/scenes/HubScene.ts
git commit -m "feat: add hub transit mechanism — pause/resume run on boss defeat"

# After Group B complete:
git add src/config/EnemyTable.ts src/entities/EnemyFactory.ts
git add src/entities/enemies/FireBatEnemy.ts src/entities/enemies/FireMageEnemy.ts
git add src/entities/enemies/LavaSlimeEnemy.ts src/entities/enemies/MagmaKnightEnemy.ts
git add src/entities/bosses/FireDragonBoss.ts
git add src/data/rooms/lava/
git commit -m "feat: add lava biome — 4 enemies, fire dragon boss, 8 room templates"

# After integration:
git add src/core/RoomGenerator.ts src/scenes/RunScene.ts
git commit -m "feat: integrate lava biome with hub transit and biome-aware room selection"
```
