# Final Fight V2 Roguelike ARPG Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Final Fight V2 from a linear side-scroller into a Roguelike ARPG with weapon system, blessing system, room-based runs, permanent progression, and hub world.

**Architecture:** Refactor the monolithic GameScene into a room-based RunScene driven by RoomGenerator + RunManager. Extract weapon logic from Player into a strategy-pattern WeaponBase system. Add BlessingManager as a decorator layer on combat. Introduce HubScene as the persistent hub between runs. All game data (weapons, enemies, blessings, rooms) driven by config tables.

**Tech Stack:** Phaser 3.86, TypeScript 5.6 strict, Vite 6, Electron 40, localStorage for save data.

**Design Doc:** `docs/plans/2026-03-04-roguelike-arpg-design.md`

---

## Phase 0: Foundation & Key Remapping (v0.3 prep)

### Task 0.1: Fix Key Conflict — Add WEAPON_SKILL key

**Files:**
- Modify: `src/utils/Constants.ts` (lines 121-131, CONTROLS object)
- Modify: `src/entities/Player.ts` (lines 53-59 keys interface, lines 129-140 setupInput)
- Modify: `src/systems/InputController.ts` (lines 12-20 keys, lines 22-40 constructor)

**Step 1: Update CONTROLS in Constants.ts**

In `src/utils/Constants.ts`, change the CONTROLS object to add WEAPON_SKILL and rename SKILL to DASH for clarity:

```typescript
export const CONTROLS = {
    LEFT: 'A',
    RIGHT: 'D',
    JUMP: 'K',
    ATTACK: 'J',
    DASH: 'L',           // was SKILL — dash/dodge
    WEAPON_SKILL: 'U',   // new — weapon special ability
    STATS: 'C',
    INVENTORY: 'I',
    MAP: 'TAB',           // new — minimap toggle
    INTERACT: 'W',        // new — NPC interaction in hub
    PAUSE: 'ESC',
    DEBUG: 'P',
};
```

**Step 2: Update Player.ts keys interface and setupInput**

In `src/entities/Player.ts`, update the keys interface (line 53-59):

```typescript
private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;        // renamed from skill
    weaponSkill: Phaser.Input.Keyboard.Key;  // new
};
```

Update setupInput method (line 129-140):

```typescript
private setupInput(scene: Phaser.Scene): void {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;

    this.keys = {
        left: keyboard.addKey(CONTROLS.LEFT),
        right: keyboard.addKey(CONTROLS.RIGHT),
        jump: keyboard.addKey(CONTROLS.JUMP),
        attack: keyboard.addKey(CONTROLS.ATTACK),
        dash: keyboard.addKey(CONTROLS.DASH),
        weaponSkill: keyboard.addKey(CONTROLS.WEAPON_SKILL),
    };
}
```

Update all references to `this.keys.skill` → `this.keys.dash` in handleDash (line 213) and update method (line 213).

**Step 3: Update InputController.ts**

In `src/systems/InputController.ts`, update the keys object and constructor to match new CONTROLS structure. Rename `skill` → `dash`, add `weaponSkill`, `map`, `interact`.

**Step 4: Verify the game runs**

Run: `yarn dev`
Expected: Game launches, A/D move, K jump, J attack, L dash (unchanged behavior), U key has no effect yet.

**Step 5: Commit**

```bash
git add src/utils/Constants.ts src/entities/Player.ts src/systems/InputController.ts
git commit -m "refactor: remap keys — separate dash(L) and weapon skill(U), add MAP/INTERACT keys"
```

---

### Task 0.2: Create SaveManager

**Files:**
- Create: `src/core/SaveManager.ts`

**Step 1: Implement SaveManager**

```typescript
/**
 * 存档管理器
 * 使用 localStorage 管理永久进度数据
 */

export interface SaveData {
    // 永久货币
    memoryShards: number;    // 记忆碎片
    gold: number;            // 金币

    // 永久升级等级
    upgrades: Record<string, number>;

    // 解锁状态
    unlockedWeapons: string[];
    unlockedBlessings: string[];

    // 统计
    totalRuns: number;
    totalDeaths: number;
    totalKills: number;
    bestRoom: number;         // 最远到达的房间数
    bossesDefeated: string[];

    // 版本（用于存档迁移）
    version: number;
}

const SAVE_KEY = 'final-fight-v2-save';
const CURRENT_VERSION = 1;

export class SaveManager {
    private static data: SaveData;

    static getDefaultSave(): SaveData {
        return {
            memoryShards: 0,
            gold: 0,
            upgrades: {},
            unlockedWeapons: ['sword'],  // 默认解锁裂空剑
            unlockedBlessings: [],
            totalRuns: 0,
            totalDeaths: 0,
            totalKills: 0,
            bestRoom: 0,
            bossesDefeated: [],
            version: CURRENT_VERSION,
        };
    }

    static load(): SaveData {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as SaveData;
                // 版本迁移预留
                if (parsed.version < CURRENT_VERSION) {
                    return this.migrate(parsed);
                }
                this.data = parsed;
                return this.data;
            }
        } catch (e) {
            console.warn('[SaveManager] Failed to load save, using default', e);
        }
        this.data = this.getDefaultSave();
        return this.data;
    }

    static save(): void {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('[SaveManager] Failed to save', e);
        }
    }

    static getData(): SaveData {
        if (!this.data) this.load();
        return this.data;
    }

    static addShards(amount: number): void {
        this.data.memoryShards += amount;
        this.save();
    }

    static addGold(amount: number): void {
        this.data.gold += amount;
        this.save();
    }

    static getUpgradeLevel(upgradeId: string): number {
        return this.data.upgrades[upgradeId] || 0;
    }

    static setUpgradeLevel(upgradeId: string, level: number): void {
        this.data.upgrades[upgradeId] = level;
        this.save();
    }

    static recordRun(kills: number, roomsCleared: number, shardsEarned: number): void {
        this.data.totalRuns++;
        this.data.totalDeaths++;
        this.data.totalKills += kills;
        this.data.memoryShards += shardsEarned;
        if (roomsCleared > this.data.bestRoom) {
            this.data.bestRoom = roomsCleared;
        }
        this.save();
    }

    static resetSave(): void {
        this.data = this.getDefaultSave();
        this.save();
    }

    private static migrate(oldData: SaveData): SaveData {
        // 未来版本迁移逻辑
        const newData = { ...this.getDefaultSave(), ...oldData, version: CURRENT_VERSION };
        this.data = newData;
        this.save();
        return newData;
    }
}
```

**Step 2: Commit**

```bash
git add src/core/SaveManager.ts
git commit -m "feat: add SaveManager with localStorage persistence"
```

---

### Task 0.3: Create RunManager (Run State Machine)

**Files:**
- Create: `src/core/RunManager.ts`

**Step 1: Implement RunManager**

```typescript
/**
 * 运行管理器
 * 管理单次运行(Run)的状态：当前区域、房间进度、祝福列表、临时资源
 */

export interface RunState {
    // 当前进度
    currentBiome: number;       // 0=石窟, 1=熔岩
    currentRoom: number;        // 当前房间序号(从0开始)
    roomsInBiome: number;       // 当前区域总房间数

    // 临时资源（死亡后清零）
    runGold: number;
    runShards: number;          // 本次运行获取的碎片

    // 战斗统计
    kills: number;
    damageTaken: number;
    damageDealt: number;
    roomsCleared: number;

    // 祝福
    activeBlessing: string[];   // 激活的祝福ID列表

    // 运行状态
    isRunActive: boolean;
    deathDefiances: number;     // 剩余复活次数
}

export class RunManager {
    private state: RunState;

    constructor() {
        this.state = this.createFreshRun();
    }

    private createFreshRun(): RunState {
        return {
            currentBiome: 0,
            currentRoom: 0,
            roomsInBiome: 6,  // 默认每区域6个房间
            runGold: 0,
            runShards: 0,
            kills: 0,
            damageTaken: 0,
            damageDealt: 0,
            roomsCleared: 0,
            activeBlessing: [],
            isRunActive: false,
            deathDefiances: 0,
        };
    }

    startRun(deathDefiances: number = 0): void {
        this.state = this.createFreshRun();
        this.state.isRunActive = true;
        this.state.deathDefiances = deathDefiances;
        console.log('[RunManager] Run started');
    }

    advanceRoom(): { isBossRoom: boolean; isNewBiome: boolean } {
        this.state.currentRoom++;
        this.state.roomsCleared++;

        const isBossRoom = this.state.currentRoom >= this.state.roomsInBiome;
        const isNewBiome = false; // Boss房间后通过 advanceBiome() 推进

        return { isBossRoom, isNewBiome };
    }

    advanceBiome(): boolean {
        this.state.currentBiome++;
        this.state.currentRoom = 0;

        // 检查是否已通关所有区域
        if (this.state.currentBiome > 1) { // v1.0只有2个区域(0和1)
            return true; // 通关
        }
        return false;
    }

    recordKill(): void {
        this.state.kills++;
    }

    addGold(amount: number): void {
        this.state.runGold += amount;
    }

    addShards(amount: number): void {
        this.state.runShards += amount;
    }

    addDamageDealt(amount: number): void {
        this.state.damageDealt += amount;
    }

    addDamageTaken(amount: number): void {
        this.state.damageTaken += amount;
    }

    addBlessing(blessingId: string): void {
        this.state.activeBlessing.push(blessingId);
    }

    removeBlessing(blessingId: string): void {
        this.state.activeBlessing = this.state.activeBlessing.filter(id => id !== blessingId);
    }

    useDeathDefiance(): boolean {
        if (this.state.deathDefiances > 0) {
            this.state.deathDefiances--;
            return true; // 成功复活
        }
        return false; // 无法复活，真正死亡
    }

    endRun(): RunState {
        this.state.isRunActive = false;
        return { ...this.state };
    }

    getState(): Readonly<RunState> {
        return this.state;
    }
}
```

**Step 2: Commit**

```bash
git add src/core/RunManager.ts
git commit -m "feat: add RunManager for per-run state tracking"
```

---

## Phase 1: Weapon System (v0.3 → v0.4)

### Task 1.1: Create WeaponBase and Weapon Config

**Files:**
- Create: `src/combat/WeaponBase.ts`
- Create: `src/config/WeaponConfig.ts`

**Step 1: Create WeaponConfig data table**

```typescript
/**
 * 武器配置数据表
 * 所有武器的数值定义
 */

export interface WeaponStats {
    id: string;
    name: string;
    type: 'melee' | 'ranged';
    baseDamage: number;
    attackRange: number;
    attackCooldown: number;     // ms
    comboSteps: number;         // 连击段数
    comboMultipliers: number[]; // 每段伤害倍率
    knockbackForce: number;
    skillCooldown: number;      // 特殊技能CD (ms)
    skillDamage: number;
    skillRange: number;
    // 动画相关
    attackAnimFrames: number[];  // 每段攻击帧数
    attackAnimFPS: number;
}

export const WEAPON_TABLE: Record<string, WeaponStats> = {
    sword: {
        id: 'sword',
        name: '裂空剑',
        type: 'melee',
        baseDamage: 20,
        attackRange: 50,
        attackCooldown: 400,
        comboSteps: 3,
        comboMultipliers: [1.0, 1.2, 1.5],
        knockbackForce: 100,
        skillCooldown: 5000,
        skillDamage: 35,
        skillRange: 80,
        attackAnimFrames: [6, 6, 4],
        attackAnimFPS: 8,
    },
    fists: {
        id: 'fists',
        name: '雷霆拳',
        type: 'melee',
        baseDamage: 8,
        attackRange: 35,
        attackCooldown: 200,
        comboSteps: 5,
        comboMultipliers: [0.8, 0.8, 1.0, 1.0, 1.8],
        knockbackForce: 40,
        skillCooldown: 4000,
        skillDamage: 25,
        skillRange: 50,
        attackAnimFrames: [4, 4, 4, 4, 6],
        attackAnimFPS: 14,
    },
    bow: {
        id: 'bow',
        name: '追影弓',
        type: 'ranged',
        baseDamage: 30,
        attackRange: 280,
        attackCooldown: 800,
        comboSteps: 1,
        comboMultipliers: [1.0],
        knockbackForce: 20,
        skillCooldown: 6000,
        skillDamage: 15, // per arrow, fires multiple
        skillRange: 200,
        attackAnimFrames: [8],
        attackAnimFPS: 10,
    },
};
```

**Step 2: Create WeaponBase abstract class**

```typescript
/**
 * 武器基类 — 策略模式
 * 每种武器实现不同的攻击行为，注入到 Player 中
 */
import Phaser from 'phaser';
import { WeaponStats } from '../config/WeaponConfig';

export abstract class WeaponBase {
    protected scene: Phaser.Scene;
    protected owner: Phaser.Physics.Arcade.Sprite;
    protected stats: WeaponStats;

    // 状态
    public isAttacking: boolean = false;
    public canDealDamage: boolean = false;
    public comboCount: number = 0;
    public damageMultiplier: number = 1.0;
    public hitEnemiesThisAttack: Set<Phaser.Physics.Arcade.Sprite> = new Set();

    // 冷却
    protected canAttack: boolean = true;
    protected canUseSkill: boolean = true;
    protected lastAttackTime: number = 0;
    protected readonly COMBO_WINDOW: number = 1000;

    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite, stats: WeaponStats) {
        this.scene = scene;
        this.owner = owner;
        this.stats = stats;
    }

    /** 普通攻击(J键) */
    abstract attack(): void;

    /** 特殊技能(U键) */
    abstract skill(): void;

    /** 获取当前攻击伤害(含连击加成) */
    getCurrentDamage(): number {
        return Math.round(this.stats.baseDamage * this.damageMultiplier);
    }

    /** 重置攻击状态 */
    resetAttack(): void {
        this.isAttacking = false;
        this.canDealDamage = false;
        this.hitEnemiesThisAttack.clear();
    }

    /** 中断攻击（冲刺时调用） */
    interruptAttack(): void {
        this.resetAttack();
    }

    getStats(): Readonly<WeaponStats> {
        return this.stats;
    }
}
```

**Step 3: Commit**

```bash
git add src/config/WeaponConfig.ts src/combat/WeaponBase.ts
git commit -m "feat: add WeaponBase strategy pattern and WeaponConfig data table"
```

---

### Task 1.2: Implement Sword Weapon (extract from Player)

**Files:**
- Create: `src/combat/weapons/SwordWeapon.ts`

**Step 1: Implement SwordWeapon**

Extract attack logic from `Player.ts:handleAttack()` (lines 284-379) into `SwordWeapon.attack()`. The logic is almost identical but now reads from `this.stats` instead of hardcoded values.

```typescript
/**
 * 裂空剑 — 默认近战武器
 * 3段连击，中速中伤害
 * 特殊技能：旋风斩（范围AOE）
 */
import Phaser from 'phaser';
import { WeaponBase } from '../WeaponBase';
import { WEAPON_TABLE } from '../../config/WeaponConfig';

export class SwordWeapon extends WeaponBase {
    constructor(scene: Phaser.Scene, owner: Phaser.Physics.Arcade.Sprite) {
        super(scene, owner, WEAPON_TABLE.sword);
    }

    attack(): void {
        if (!this.canAttack) return;

        this.isAttacking = true;
        this.canAttack = false;
        this.hitEnemiesThisAttack.clear();
        this.canDealDamage = false;

        // 连击逻辑
        const currentTime = this.scene.time.now;
        if (currentTime - this.lastAttackTime < this.COMBO_WINDOW) {
            this.comboCount++;
            if (this.comboCount >= this.stats.comboSteps) {
                this.comboCount = 0;
            }
        } else {
            this.comboCount = 0;
        }
        this.lastAttackTime = currentTime;

        // 伤害倍率
        this.damageMultiplier = this.stats.comboMultipliers[this.comboCount] || 1.0;

        // 播放攻击动画（复用现有player-attack动画键）
        const attackKeys = ['player-attack', 'player-attack-2', 'player-attack-3'];
        const attackAnimKey = attackKeys[this.comboCount] || attackKeys[0];
        const frameCount = this.stats.attackAnimFrames[this.comboCount] || 6;

        this.owner.play(attackAnimKey, true);

        // 攻击进度达40%时允许造成伤害
        const onAnimationUpdate = (
            animation: Phaser.Animations.Animation,
            frame: Phaser.Animations.AnimationFrame,
        ) => {
            if (animation.key === attackAnimKey) {
                const progress = frame.index / frameCount;
                if (progress >= 0.4 && !this.canDealDamage) {
                    this.canDealDamage = true;
                }
            }
        };

        this.owner.on('animationupdate', onAnimationUpdate);

        this.owner.once('animationcomplete', (animation: Phaser.Animations.Animation) => {
            if (animation.key === attackAnimKey) {
                this.owner.off('animationupdate', onAnimationUpdate);
                this.scene.time.delayedCall(50, () => {
                    this.resetAttack();
                });
            }
        });

        // 攻击冷却
        this.scene.time.delayedCall(this.stats.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    skill(): void {
        if (!this.canUseSkill) return;

        this.canUseSkill = false;

        // 旋风斩：以玩家为中心的范围攻击
        // 这里设置一个特殊标记，让 CombatSystem 检测 360 度范围
        this.isAttacking = true;
        this.canDealDamage = true;
        this.hitEnemiesThisAttack.clear();

        // 用临时的更大攻击范围
        const originalRange = this.stats.attackRange;
        (this.stats as any)._originalRange = originalRange;
        (this.stats as any).attackRange = this.stats.skillRange;
        this.damageMultiplier = this.stats.skillDamage / this.stats.baseDamage;

        // 播放技能动画（暂时复用attack-3）
        this.owner.play('player-attack-3', true);

        this.owner.once('animationcomplete', () => {
            this.resetAttack();
            (this.stats as any).attackRange = originalRange;
            this.damageMultiplier = 1.0;
        });

        // 技能冷却
        this.scene.time.delayedCall(this.stats.skillCooldown, () => {
            this.canUseSkill = true;
        });
    }
}
```

**Step 2: Commit**

```bash
git add src/combat/weapons/SwordWeapon.ts
git commit -m "feat: implement SwordWeapon — extract attack logic from Player"
```

---

### Task 1.3: Refactor Player to Use Weapon System

**Files:**
- Modify: `src/entities/Player.ts` — remove embedded attack logic, delegate to weapon

**Step 1: Add weapon property and refactor**

Add to Player class:
- `import { WeaponBase } from '../combat/WeaponBase'`
- `import { SwordWeapon } from '../combat/weapons/SwordWeapon'`
- Property: `public weapon: WeaponBase;`
- In constructor: `this.weapon = new SwordWeapon(scene, this);`

**Step 2: Refactor handleAttack**

Replace the entire `handleAttack()` method body to delegate to weapon:

```typescript
private handleAttack(): void {
    // 清除超时的缓冲输入
    if (
        this.bufferedAttack &&
        this.scene.time.now - this.bufferedAttackTime > this.ATTACK_BUFFER_WINDOW
    ) {
        this.bufferedAttack = false;
    }

    const shouldAttack =
        this.bufferedAttack ||
        Phaser.Input.Keyboard.JustDown(this.keys.attack);

    if (shouldAttack && !this.weapon.isAttacking) {
        this.bufferedAttack = false;
        this.weapon.attack();
        this.currentState = PlayerState.ATTACK;
    }
}
```

**Step 3: Add handleWeaponSkill method**

```typescript
private handleWeaponSkill(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.weaponSkill)) {
        this.weapon.skill();
    }
}
```

Call it in `update()` after handleAttack().

**Step 4: Update isAttacking/canDealDamage/hitEnemiesThisAttack references**

Throughout Player.ts, replace:
- `this.isAttacking` → `this.weapon.isAttacking`
- `this.canDealDamage` → `this.weapon.canDealDamage`
- `this.hitEnemiesThisAttack` → `this.weapon.hitEnemiesThisAttack`
- `this.getCurrentDamage()` → `this.weapon.getCurrentDamage()`
- `this.damageMultiplier` → `this.weapon.damageMultiplier`
- `this.comboCount` → `this.weapon.comboCount`

Keep `attackDamage` on Player for backward compatibility but have it read from `this.weapon.getStats().baseDamage`.

**Step 5: Update handleDash to use weapon.interruptAttack()**

In handleDash (line 610-615), replace attack interrupt block with:
```typescript
if (this.weapon.isAttacking) {
    this.weapon.interruptAttack();
}
```

**Step 6: Update GameScene references**

In `src/scenes/GameScene.ts`, update `handlePlayerAttackOverlap` and `checkAttacksByDistance` to read from `playerEntity.weapon.*` instead of directly from player properties.

**Step 7: Verify the game runs**

Run: `yarn dev`
Expected: Sword attack behavior identical to before. J attacks, L dashes, U triggers weapon skill (旋风斩).

**Step 8: Commit**

```bash
git add src/entities/Player.ts src/scenes/GameScene.ts
git commit -m "refactor: Player delegates attack to WeaponBase strategy — sword behavior preserved"
```

---

### Task 1.4: Implement Fists Weapon

**Files:**
- Create: `src/combat/weapons/FistsWeapon.ts`

**Step 1: Implement FistsWeapon**

Similar to SwordWeapon but with 5-combo chain, faster cooldown (200ms), smaller range (35px), lower per-hit damage (8). Skill: 3-hit locked combo.

Animations: v1.0 reuses sword animations with faster frameRate. Custom fist anims can be added later.

**Step 2: Commit**

```bash
git add src/combat/weapons/FistsWeapon.ts
git commit -m "feat: implement FistsWeapon — 5-combo rapid melee"
```

---

### Task 1.5: Implement Bow Weapon

**Files:**
- Create: `src/combat/weapons/BowWeapon.ts`

**Step 1: Implement BowWeapon**

Ranged weapon. `attack()` creates a projectile (reuse `ArcherEnemy` projectile logic from `src/entities/ArcherEnemy.ts`). No combo — single powerful shot. Skill: fires 5 arrows in a spread pattern.

Reference `ArcherEnemy.ts` projectile creation pattern for the implementation.

**Step 2: Commit**

```bash
git add src/combat/weapons/BowWeapon.ts
git commit -m "feat: implement BowWeapon — ranged projectile weapon"
```

---

### Task 1.6: Add Weapon Switching in Hub

**Files:**
- Modify: `src/entities/Player.ts` — add `equipWeapon(weaponId: string)` method
- Create: `src/combat/WeaponFactory.ts` — factory to create weapons by ID

**Step 1: Create WeaponFactory**

```typescript
import { WeaponBase } from './WeaponBase';
import { SwordWeapon } from './weapons/SwordWeapon';
import { FistsWeapon } from './weapons/FistsWeapon';
import { BowWeapon } from './weapons/BowWeapon';

export class WeaponFactory {
    static create(
        weaponId: string,
        scene: Phaser.Scene,
        owner: Phaser.Physics.Arcade.Sprite,
    ): WeaponBase {
        switch (weaponId) {
            case 'sword': return new SwordWeapon(scene, owner);
            case 'fists': return new FistsWeapon(scene, owner);
            case 'bow': return new BowWeapon(scene, owner);
            default: return new SwordWeapon(scene, owner);
        }
    }
}
```

**Step 2: Add equipWeapon to Player**

```typescript
public equipWeapon(weaponId: string): void {
    this.weapon.interruptAttack();
    this.weapon = WeaponFactory.create(weaponId, this.scene as GameScene, this);
}
```

**Step 3: Commit**

```bash
git add src/combat/WeaponFactory.ts src/entities/Player.ts
git commit -m "feat: add WeaponFactory and Player.equipWeapon for weapon switching"
```

---

## Phase 2: Room System (v0.3)

### Task 2.1: Create RoomConfig Types and First Room Templates

**Files:**
- Create: `src/config/RoomConfig.ts` — TypeScript interfaces
- Create: `src/data/rooms/cavern/combat-flat-01.json`
- Create: `src/data/rooms/cavern/combat-platforms-01.json`
- Create: `src/data/rooms/cavern/combat-corridor-01.json`

**Step 1: Define RoomConfig interface**

```typescript
export interface PlatformData {
    x: number;
    y: number;
    tileCount: number;
}

export interface SpawnData {
    type: string;   // enemy type ID from EnemyTable
    x: number;
    y: number;
}

export interface HazardData {
    type: 'spikes' | 'lava' | 'falling_rock';
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ExitData {
    position: 'left' | 'right' | 'top';
    x: number;
    y: number;
}

export interface RoomConfig {
    id: string;
    biome: string;
    type: 'combat' | 'elite' | 'shop' | 'rest' | 'event' | 'boss';
    size: { width: number; height: number };
    playerSpawn: { x: number; y: number };
    groundY: number;
    platforms: PlatformData[];
    spawns: SpawnData[];
    hazards: HazardData[];
    exits: ExitData[];
}
```

**Step 2: Create 3 room template JSON files**

Create hand-crafted JSON files for: flat arena, platform arena, corridor. Each follows the `RoomConfig` schema.

**Step 3: Commit**

```bash
git add src/config/RoomConfig.ts src/data/rooms/
git commit -m "feat: add RoomConfig types and first 3 cavern room templates"
```

---

### Task 2.2: Create RoomGenerator

**Files:**
- Create: `src/core/RoomGenerator.ts`

**Step 1: Implement RoomGenerator**

Responsible for:
1. Loading a RoomConfig (from JSON or imported object)
2. Creating Phaser physics objects (platforms, enemies, hazards)
3. Cleaning up all objects when transitioning rooms

```typescript
/**
 * 房间生成器
 * 读取 RoomConfig，动态创建 Phaser 物理对象
 */
import Phaser from 'phaser';
import { RoomConfig } from '../config/RoomConfig';
import { TILE_SIZE, ASSETS, DEPTH } from '../utils/Constants';
// Enemy imports...

export class RoomGenerator {
    private scene: Phaser.Scene;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private enemies!: Phaser.Physics.Arcade.Group;
    private hazards: Phaser.GameObjects.GameObject[] = [];
    private decorations: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    generate(config: RoomConfig): {
        platforms: Phaser.Physics.Arcade.StaticGroup;
        enemies: Phaser.Physics.Arcade.Group;
    } {
        this.cleanup();

        // 设置世界边界
        this.scene.physics.world.setBounds(0, 0, config.size.width, config.size.height);

        // 创建平台
        this.platforms = this.scene.physics.add.staticGroup();
        this.createGround(config);
        config.platforms.forEach(p => this.createPlatform(p.x, p.y, p.tileCount));

        // 创建敌人
        this.enemies = this.scene.physics.add.group();
        config.spawns.forEach(s => this.spawnEnemy(s.type, s.x, s.y));

        // 创建环境危险
        config.hazards.forEach(h => this.createHazard(h));

        return { platforms: this.platforms, enemies: this.enemies };
    }

    private createGround(config: RoomConfig): void {
        const numTiles = Math.ceil(config.size.width / TILE_SIZE);
        for (let i = 0; i < numTiles; i++) {
            const tileIndex = Phaser.Math.Between(1, 11);
            const ground = this.platforms.create(
                i * TILE_SIZE + TILE_SIZE / 2,
                config.groundY + TILE_SIZE / 2,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;
            ground.setScale(0.5);
            ground.refreshBody();
        }
    }

    private createPlatform(x: number, y: number, tileCount: number): void {
        for (let i = 0; i < tileCount; i++) {
            const tileIndex = Phaser.Math.Between(1, 11);
            const tile = this.platforms.create(
                x + i * TILE_SIZE * 0.5,
                y,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;
            tile.setScale(0.5);
            tile.setDepth(DEPTH.TILEMAP);
            tile.refreshBody();
        }
    }

    private spawnEnemy(type: string, x: number, y: number): void {
        // Factory pattern: create enemy by type string
        // Import and instantiate the correct enemy class
        // Add to this.enemies group
    }

    private createHazard(hazard: any): void {
        // Create hazard zone (visual + damage zone)
        // Add to this.hazards array for cleanup
    }

    cleanup(): void {
        // Destroy all objects from previous room
        if (this.platforms) {
            this.platforms.clear(true, true);
        }
        if (this.enemies) {
            this.enemies.clear(true, true);
        }
        this.hazards.forEach(h => h.destroy());
        this.hazards = [];
        this.decorations.forEach(d => d.destroy());
        this.decorations = [];
    }
}
```

**Step 2: Commit**

```bash
git add src/core/RoomGenerator.ts
git commit -m "feat: add RoomGenerator — dynamic room creation from templates"
```

---

### Task 2.3: Create RunScene (Replace GameScene for Runs)

**Files:**
- Create: `src/scenes/RunScene.ts` — refactored from GameScene for room-based runs
- Modify: `src/config/gameConfig.ts` — register RunScene
- Modify: `src/utils/Constants.ts` — add RUN scene key

**Step 1: Create RunScene**

RunScene is a refactored GameScene that:
- Uses `RoomGenerator` instead of hardcoded level
- Uses `RunManager` to track run progress
- Handles room transitions (clear room → reward selection → next room)
- Has exits that trigger room advancement

Core flow in RunScene:
```
create() → roomGenerator.generate(currentRoomConfig) → setupCollisions() → play
room cleared → emit 'room-cleared' → show reward/blessing selection → load next room
boss defeated → advanceBiome() or win
player died → check deathDefiance → death screen or revive
```

This is a large file (~400 lines) derived from GameScene.ts. Key differences:
- No hardcoded enemy positions — read from RoomConfig
- No hardcoded platforms — read from RoomConfig
- Room transition logic in `onRoomCleared()`
- `loadRoom(roomConfig)` method that calls `roomGenerator.generate()`

**Step 2: Register in gameConfig**

Add `RunScene` to scene array in `src/config/gameConfig.ts` (line 51).
Add `RUN: 'RunScene'` to SCENES in Constants.ts.

**Step 3: Commit**

```bash
git add src/scenes/RunScene.ts src/config/gameConfig.ts src/utils/Constants.ts
git commit -m "feat: add RunScene — room-based gameplay with RoomGenerator"
```

---

## Phase 3: Hub World (v0.3)

### Task 3.1: Create HubScene

**Files:**
- Create: `src/scenes/HubScene.ts`
- Modify: `src/config/gameConfig.ts` — register HubScene
- Modify: `src/utils/Constants.ts` — add HUB scene key

**Step 1: Implement HubScene**

A static scene with:
- Fixed background (dark cave with warm firelight)
- Player character (walkable but no enemies)
- 3 NPC interaction zones (Blacksmith, Herbalist, Traveler) — positioned with visual markers
- Memory Mirror interaction zone (upgrade menu)
- Corridor Gate (starts a run → transition to RunScene)
- W key to interact when near NPC/object

Flow: MenuScene → HubScene → (interact/upgrade) → Enter Gate → RunScene → (death) → HubScene

**Step 2: Register in gameConfig and Constants**

Add `HUB: 'HubScene'` to SCENES. Add HubScene to scene array.

**Step 3: Update MenuScene**

Change `MenuScene.startGame()` to go to HubScene instead of GameScene:
```typescript
this.scene.start(SCENES.HUB);
```

**Step 4: Commit**

```bash
git add src/scenes/HubScene.ts src/scenes/MenuScene.ts src/config/gameConfig.ts src/utils/Constants.ts
git commit -m "feat: add HubScene — persistent hub between runs with NPC zones"
```

---

### Task 3.2: Create DeathScene

**Files:**
- Create: `src/scenes/DeathScene.ts`
- Modify: `src/config/gameConfig.ts` — register
- Modify: `src/utils/Constants.ts` — add DEATH scene key

**Step 1: Implement DeathScene**

Shows run summary: kills, rooms cleared, damage dealt, shards earned. Calls `SaveManager.recordRun()` to persist stats. "Return to Hub" button transitions to HubScene.

**Step 2: Commit**

```bash
git add src/scenes/DeathScene.ts src/config/gameConfig.ts src/utils/Constants.ts
git commit -m "feat: add DeathScene — run summary with persistent stats"
```

---

## Phase 4: Blessing System (v0.4)

### Task 4.1: Create Blessing Config and Manager

**Files:**
- Create: `src/config/BlessingTable.ts`
- Create: `src/combat/BlessingManager.ts`

**Step 1: Define blessing data**

12-15 blessings across 3 gods (Fire/Thunder/Ice), each modifying attack/skill/dash/passive slots.

**Step 2: Implement BlessingManager**

Decorator pattern: wraps damage calculation functions. When a blessing is active, it modifies the output of `DamageCalculator` or adds status effects.

```typescript
export class BlessingManager {
    private activeBlessing: Map<string, BlessingData> = new Map();

    addBlessing(blessing: BlessingData): void { ... }
    removeBlessing(blessingId: string): void { ... }
    applyAttackModifiers(baseDamage: number, target: Enemy): { damage: number; effects: StatusEffect[] } { ... }
    clearAll(): void { ... }
}
```

**Step 3: Commit**

```bash
git add src/config/BlessingTable.ts src/combat/BlessingManager.ts
git commit -m "feat: add BlessingTable and BlessingManager decorator system"
```

---

### Task 4.2: Create BlessingSelectScene

**Files:**
- Create: `src/scenes/BlessingSelectScene.ts`
- Create: `src/ui/BlessingCard.ts`

**Step 1: Implement blessing selection UI**

Overlay scene (like UIScene) that pauses the run and displays 3 blessing cards. Player selects one with mouse click or 1/2/3 keys.

Each card shows: god icon (colored circle), name, rarity, effect description, binding slot.

**Step 2: Commit**

```bash
git add src/scenes/BlessingSelectScene.ts src/ui/BlessingCard.ts
git commit -m "feat: add BlessingSelectScene — 3-card blessing choice after room clear"
```

---

### Task 4.3: Create Status Effects System

**Files:**
- Create: `src/combat/StatusEffects.ts`

**Step 1: Implement StatusEffects**

Tick-based system. Each effect has: type (burn/slow/chain), duration, tickInterval, damage/modifier per tick. Applied to enemies via `enemy.addStatusEffect()`.

```typescript
export interface StatusEffect {
    type: 'burn' | 'slow' | 'chain';
    duration: number;      // ms remaining
    tickInterval: number;  // ms between ticks
    value: number;         // damage per tick or slow percentage
    lastTick: number;      // timestamp of last tick
}
```

**Step 2: Add to Enemy base class**

Add `statusEffects: StatusEffect[]` array to `Enemy.ts`. In `Enemy.update()`, process effects each frame.

**Step 3: Commit**

```bash
git add src/combat/StatusEffects.ts src/entities/Enemy.ts
git commit -m "feat: add StatusEffects tick system — burn, slow, chain lightning"
```

---

## Phase 5: Enemies & Boss (v0.5)

### Task 5.1: Create EnemyTable and EnemyFactory

**Files:**
- Create: `src/config/EnemyTable.ts` — all enemy data in one table
- Create: `src/entities/EnemyFactory.ts` — factory to spawn by type string

Consolidate enemy config from `Constants.ts` ENEMY_CONFIG into a unified table. Add new enemy types (BombBug, EliteSkeleton).

---

### Task 5.2: Implement New Enemies for Cavern Biome

**Files:**
- Create: `src/entities/enemies/BombBugEnemy.ts` — approaches then self-destructs
- Create: `src/entities/enemies/EliteSkeletonEnemy.ts` — fast combo + dodge

Each extends `Enemy` base, implements `playAttackAnimation()` and `updateAnimation()`.

---

### Task 5.3: Implement Boss 1 — Stone Golem

**Files:**
- Create: `src/entities/bosses/StoneGolemBoss.ts`
- Create: `src/data/rooms/cavern/boss-stone-golem.json`

3-phase boss with telegraph system. Extends Enemy but with `BossPhase` enum and `updateBossAI()` override.

---

## Phase 6: Permanent Upgrades (v0.6)

### Task 6.1: Create MetaProgress System

**Files:**
- Create: `src/core/MetaProgress.ts`
- Create: `src/config/UpgradeTable.ts`

Reads/writes to SaveManager. Applies permanent stat bonuses to Player at run start.

---

### Task 6.2: Create Upgrade UI in Hub

**Files:**
- Create: `src/ui/UpgradePanel.ts`

Memory Mirror interaction: displays upgrade tree, costs, current levels. Click to purchase with shards.

---

## Phase 7: Lava Biome (v0.7)

### Task 7.1: Create Lava Biome Room Templates

15-20 room templates with lava hazards, fire geysers, different visual theme.

### Task 7.2: Implement Lava Enemies

LavaSlime (splits), FireMage (AOE), LavaGolem (earthquake), FireLizard (hit-and-run), RockGolem (ranged+melee).

### Task 7.3: Implement Boss 2 — Fire Dragon

Multi-phase aerial boss.

---

## Phase 8: Audio (v0.8)

### Task 8.1: Create AudioManager

**Files:**
- Create: `src/systems/AudioManager.ts`

Wraps Phaser SoundManager. Manages BGM crossfade, SFX volume, mute toggle.

### Task 8.2: Generate and Integrate SFX

Use jsfxr to generate ~30 pixel-art style sound effects. Integrate into attack/hit/death/UI events.

### Task 8.3: Add BGM per Biome

Source or generate BGM tracks. Hub (calm), Cavern (tense), Lava (intense), Boss (epic).

---

## Phase 9: Visual Polish (v0.8)

### Task 9.1: Add Landing Dust Particles

In Player.update(), detect landing (was airborne → now onFloor) and emit dust particles via EffectsManager.

### Task 9.2: Add Dash Afterimage

During dash, spawn 3-4 semi-transparent copies of current sprite at previous positions.

### Task 9.3: Add Enemy Flash-White on Hit

In Enemy.takeDamage(), set sprite to white tint for 1 frame before red tint.

### Task 9.4: Add Last-Kill Slowmo

When last enemy in room dies, set `this.time.timeScale = 0.3` for 300ms, then restore.

---

## Phase 10: UI Polish & Balance (v0.9)

### Task 10.1: Redesign HUD

Implement minimal HUD per design doc (HP left, gold right, skill CD bottom center).

### Task 10.2: Add MiniMap

TAB toggles room map showing explored rooms and available exits.

### Task 10.3: Balance Pass

Tune all numbers in WeaponConfig, EnemyTable, BlessingTable, UpgradeTable. Ensure first run dies in 5-10 min, experienced player clears in 20 min.

---

## Phase 11: Final (v1.0)

### Task 11.1: Heat System (Post-Clear Difficulty)

After first successful escape, unlock Pact of Punishment with selectable modifiers.

### Task 11.2: Bug Fix Pass

Address all known issues from QA testing.

### Task 11.3: Build & Package

`yarn build:electron` — verify Electron distributable works on macOS.
