/**
 * 运行场景 — 房间制战斗循环
 * 替代 GameScene 用于 Roguelike 运行。
 * 使用 RoomGenerator 动态创建房间，RunManager 追踪运行状态。
 *
 * 流程: 加载房间 → 战斗 → 清完敌人 → 下一个房间 → Boss → 通关/死亡
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    ASSETS,
} from '@/utils/Constants';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { Player } from '@/entities/Player';
import { Enemy } from '@/entities/Enemy';
import { ArcherEnemy } from '@/entities/ArcherEnemy';
import { InputController } from '@/systems/InputController';
import { CameraShake, ShakeIntensity } from '@/utils/CameraShake';
import { DamageText, DamageType } from '@/ui/DamageText';
import { PlayerStatsPanel } from '@/ui/PlayerStatsPanel';
import { HitStop } from '@/utils/HitStop';
import { EffectsManager } from '@/utils/EffectsManager';
import { BowWeapon } from '@/combat/weapons/BowWeapon';
import { RoomGenerator, RoomObjects } from '@/core/RoomGenerator';
import { RunManager } from '@/core/RunManager';
import { RoomConfig } from '@/config/RoomConfig';
import { CAVERN_COMBAT_ROOMS, CAVERN_ELITE_ROOMS, CAVERN_BOSS_ROOM } from '@/data/rooms/cavern/index';
import { LAVA_COMBAT_ROOMS, LAVA_ELITE_ROOMS, LAVA_BOSS_ROOM } from '@/data/rooms/lava/index';
import { BlessingManager } from '@/combat/BlessingManager';
import { MetaProgress } from '@/core/MetaProgress';
import { SaveManager } from '@/core/SaveManager';
import { StoneGolemBoss } from '@/entities/bosses/StoneGolemBoss';
import { FireMageEnemy } from '@/entities/enemies/FireMageEnemy';
import { EnemyFactory } from '@/entities/EnemyFactory';

/** 房间阶段 */
enum RoomPhase {
    /** 加载中（过场） */
    LOADING,
    /** 战斗中 */
    COMBAT,
    /** 已清理，等待玩家进入出口 */
    CLEARED,
    /** 过渡到下一个房间 */
    TRANSITION,
}

export class RunScene extends Phaser.Scene {
    // 核心管理器
    private runManager!: RunManager;
    private roomGenerator!: RoomGenerator;

    // 当前房间状态
    private roomPhase: RoomPhase = RoomPhase.LOADING;
    private currentRoomConfig!: RoomConfig;

    // 祝福系统
    private blessingManager!: BlessingManager;

    // 物理对象引用
    public player!: Player;
    public enemies!: Phaser.Physics.Arcade.Group;
    public platforms!: Phaser.Physics.Arcade.StaticGroup;
    public inputController!: InputController;
    public playerEnemyCollider?: Phaser.Physics.Arcade.Collider;

    // 视觉
    private sky?: Phaser.GameObjects.TileSprite;
    private mountains?: Phaser.GameObjects.TileSprite;
    private trees?: Phaser.GameObjects.TileSprite;

    // 升级加成
    public goldMultiplier: number = 1.0;
    private blessingLuckBonus: number = 0;

    // UI
    private isPaused: boolean = false;
    private isDebugMode: boolean = false;
    private fpsText?: Phaser.GameObjects.Text;
    private statsPanel?: PlayerStatsPanel;
    private roomInfoText?: Phaser.GameObjects.Text;

    // 出口区域（房间清理后激活）
    private exitZone?: Phaser.GameObjects.Zone;

    constructor() {
        super({ key: SCENES.RUN });
    }

    create(): void {
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // 初始化管理器
        this.roomGenerator = new RoomGenerator(this);
        this.blessingManager = new BlessingManager();

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

        // 输入
        this.inputController = new InputController(this);

        // 背景（持久化，不随房间清理）
        this.createParallaxBackground();

        // 创建玩家
        this.createPlayer();

        // 应用永久升级加成
        const bonuses = MetaProgress.getStatBonuses();
        this.player.applyUpgradeBonuses(bonuses);
        this.goldMultiplier = bonuses.goldMultiplier;
        this.blessingLuckBonus = bonuses.blessingLuckBonus;

        // 仅新运行时启动（恢复的运行已有状态）
        if (!resumedManager) {
            this.runManager.startRun(bonuses.revives);
        }

        // 加载第一个房间
        this.loadRoom(this.pickRoom());

        // 监听键位
        this.setupKeys();

        // UI
        this.statsPanel = new PlayerStatsPanel(this, this.player, this.blessingManager);
        this.createFpsText();
        this.createRoomInfoText();

        // 监听玩家死亡
        this.events.on('player-died', this.handlePlayerDeath, this);

        // 监听爆炸虫自爆
        this.events.on('bomb-explosion', this.handleBombExplosion, this);

        // 监听 Boss 地震波
        this.events.on('boss-quake', this.handleBossQuake, this);

        // 监听 Boss 击败
        this.events.on('boss-defeated', this.handleBossDefeated, this);

        // 监听敌人击杀（记录统计）
        this.events.on('enemy-killed', () => { this.runManager.recordKill(); });

        // 监听动态敌人生成（史莱姆分裂、Boss召唤等）
        this.events.on('enemy-spawned', this.handleEnemySpawned, this);
        this.events.on('boss-summon', this.handleBossSummon, this);

        // 启动 UI 场景
        this.scene.launch(SCENES.UI, { parentScene: SCENES.RUN });
    }

    // ===== 房间管理 =====

    /**
     * 随机选一个当前区域的房间模板
     */
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

    /**
     * 加载并生成房间
     */
    private loadRoom(config: RoomConfig): void {
        this.roomPhase = RoomPhase.LOADING;
        this.currentRoomConfig = config;

        // 清理出口
        if (this.exitZone) {
            this.exitZone.destroy();
            this.exitZone = undefined;
        }

        // 生成房间
        const roomObjects: RoomObjects = this.roomGenerator.generate(config);
        this.platforms = roomObjects.platforms;
        this.enemies = roomObjects.enemies;

        // 放置玩家
        this.player.setPosition(config.playerSpawn.x, config.playerSpawn.y);
        this.player.setVelocity(0, 0);

        // 设置碰撞
        this.setupCollisions();

        // 设置相机
        this.setupCamera(config.size.width);

        // 更新房间信息
        this.updateRoomInfo();

        // 进入战斗阶段
        this.roomPhase = RoomPhase.COMBAT;
        console.log(`[RunScene] 房间加载: ${config.id} (${this.runManager.getState().roomsCleared + 1}/${this.runManager.getState().roomsInBiome})`);
    }

    /**
     * 房间清理完毕，触发祝福选择
     */
    private onRoomCleared(): void {
        // Boss 房间由 handleBossDefeated 处理过渡，这里跳过
        if (this.currentRoomConfig.type === 'boss') return;

        this.roomPhase = RoomPhase.CLEARED;
        console.log('[RunScene] 房间已清理！');

        // 触发祝福选择
        this.showBlessingSelect();
    }

    /**
     * 显示祝福选择界面
     */
    private showBlessingSelect(): void {
        // 暂停物理和动画
        this.physics.pause();

        // 禁用 RunScene 键盘输入，防止与 BlessingSelectScene 的按键冲突
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        // 监听祝福选择完成
        this.events.once('blessing-selected', () => {
            // 重新启用 RunScene 键盘输入
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
            // 恢复物理
            this.physics.resume();
            // 创建出口
            this.createExit();
        });

        // 启动祝福选择场景
        this.scene.launch(SCENES.BLESSING, {
            blessingManager: this.blessingManager,
            runManager: this.runManager,
            luckBonus: this.blessingLuckBonus,
        });
    }

    /**
     * 创建房间出口
     */
    private createExit(): void {
        const exitData = this.currentRoomConfig.exits[0];
        if (!exitData) return;

        this.exitZone = this.add.zone(exitData.x, exitData.y, 60, 80);
        this.physics.add.existing(this.exitZone, true);

        const exitText = this.add.text(exitData.x, exitData.y - 60, '▶ 出口', {
            fontSize: '16px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3,
        });
        exitText.setOrigin(0.5);
        exitText.setDepth(DEPTH.UI);

        this.tweens.add({
            targets: exitText,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        this.physics.add.overlap(this.player, this.exitZone, () => {
            if (this.roomPhase !== RoomPhase.CLEARED) return;
            this.roomPhase = RoomPhase.TRANSITION;
            exitText.destroy();
            this.transitionToNextRoom();
        });
    }

    /**
     * 过渡到下一个房间
     */
    private transitionToNextRoom(): void {
        const { isBossRoom } = this.runManager.advanceRoom();

        // 淡出 → 加载新房间 → 淡入
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

    /**
     * 通关处理
     */
    private handleRunComplete(): void {
        const finalState = this.runManager.endRun();
        this.scene.stop(SCENES.UI);
        this.scene.start(SCENES.WIN, { runState: finalState });
    }

    // ===== 创建方法 =====

    private createParallaxBackground(): void {
        const biome = this.runManager.getCurrentBiome();
        const bgColor = biome === 0 ? '#2a1a3a' : '#3a1a1a'; // 石窟暗紫 / 熔岩暗红
        this.cameras.main.setBackgroundColor(bgColor);

        this.sky = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ASSETS.SKY_BACKGROUND);
        this.sky.setOrigin(0, 0);
        this.sky.setScrollFactor(0);
        this.sky.setDepth(DEPTH.BACKGROUND);

        this.mountains = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ASSETS.MOUNTAINS_BACKGROUND);
        this.mountains.setOrigin(0, 0);
        this.mountains.setScrollFactor(0);
        this.mountains.setDepth(DEPTH.BACKGROUND + 1);

        this.trees = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ASSETS.TREES_BACKGROUND);
        this.trees.setOrigin(0, 0);
        this.trees.setScrollFactor(0);
        this.trees.setDepth(DEPTH.BACKGROUND + 2);
    }

    private createPlayer(): void {
        this.player = new Player(this, 100, GAME_HEIGHT - 150);
        this.player.setDepth(DEPTH.PLAYER);
    }

    private setupCollisions(): void {
        // 清除旧碰撞器（Phaser自动管理，但手动清理更安全）
        this.physics.world.colliders.destroy();

        // 玩家与平台
        this.physics.add.collider(this.player, this.platforms);

        // 敌人与平台
        this.physics.add.collider(this.enemies, this.platforms);

        // 玩家与敌人：物理碰撞（踩头）
        this.playerEnemyCollider = this.physics.add.collider(
            this.player,
            this.enemies,
            this.handlePlayerEnemyPhysicsCollision,
            undefined,
            this,
        );

        // 玩家攻击判定 overlap
        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.handlePlayerAttackOverlap,
            undefined,
            this,
        );

        // 敌人攻击判定 overlap
        this.physics.add.overlap(
            this.enemies,
            this.player,
            this.handleEnemyAttackOverlap,
            undefined,
            this,
        );
    }

    private setupCamera(worldWidth: number): void {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);
        this.cameras.main.setDeadzone(200, 100);
    }

    private setupKeys(): void {
        this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard?.on('keydown-P', () => this.toggleDebugMode());
        this.input.keyboard?.on('keydown-C', () => this.statsPanel?.toggle());

        // 调试武器切换
        this.input.keyboard?.on('keydown-ONE', () => {
            this.player.equipWeapon('sword');
            console.log('[Debug] 切换武器: 裂空剑');
        });
        this.input.keyboard?.on('keydown-TWO', () => {
            this.player.equipWeapon('fists');
            console.log('[Debug] 切换武器: 雷霆拳');
        });
        this.input.keyboard?.on('keydown-THREE', () => {
            this.player.equipWeapon('bow');
            console.log('[Debug] 切换武器: 追影弓');
        });
    }

    private createFpsText(): void {
        const screenWidth = this.cameras.main.width;
        this.fpsText = this.add.text(screenWidth - 100, 10, 'FPS: 0', {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 },
        });
        this.fpsText.setDepth(2000);
        this.fpsText.setScrollFactor(0);
        this.fpsText.setVisible(false);
    }

    private createRoomInfoText(): void {
        this.roomInfoText = this.add.text(GAME_WIDTH / 2, 10, '', {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });
        this.roomInfoText.setOrigin(0.5, 0);
        this.roomInfoText.setDepth(DEPTH.UI);
        this.roomInfoText.setScrollFactor(0);
    }

    private updateRoomInfo(): void {
        const state = this.runManager.getState();
        const biomeNames = ['石窟', '熔岩'];
        const biomeName = biomeNames[state.currentBiome] || '未知';
        this.roomInfoText?.setText(`${biomeName} - 房间 ${state.roomsCleared + 1}/${state.roomsInBiome}`);
    }

    // ===== 战斗处理（从 GameScene 复用） =====

    private handlePlayerAttackOverlap = (player: any, enemy: any): void => {
        const playerEntity = player as Player;
        const enemyEntity = enemy as Enemy;

        if (enemyEntity.isDead) return;
        if (!playerEntity.weapon.isAttacking) return;
        if (!playerEntity.weapon.canDealDamage) return;
        if (playerEntity.weapon.isRanged()) return;

        const isAttackingTowardsEnemy =
            (playerEntity.flipX && enemyEntity.x < playerEntity.x) ||
            (!playerEntity.flipX && enemyEntity.x > playerEntity.x);
        if (!isAttackingTowardsEnemy) return;
        if (playerEntity.weapon.hitEnemiesThisAttack.has(enemyEntity)) return;

        const { critChanceBonus, critMultiplierBonus } = this.blessingManager.getCritBonus();
        const isCritical = Math.random() < (playerEntity.criticalChance + critChanceBonus);
        const currentDamage = playerEntity.getCurrentDamage();
        const { damage: blessedDamage, effects: statusEffects } = this.blessingManager.applyAttackModifiers(currentDamage, this.time.now);
        const finalDamage = isCritical
            ? Math.round(blessedDamage * (playerEntity.criticalMultiplier + critMultiplierBonus))
            : blessedDamage;

        CameraShake.shake(this.cameras.main, isCritical ? ShakeIntensity.HEAVY : ShakeIntensity.LIGHT);
        DamageText.create(this, enemyEntity.x, enemyEntity.y - 30, finalDamage, isCritical ? DamageType.CRITICAL : DamageType.NORMAL);
        EffectsManager.createSlashEffect(this, (playerEntity.x + enemyEntity.x) / 2, (playerEntity.y + enemyEntity.y) / 2 - 10, !playerEntity.flipX, isCritical);
        EffectsManager.createHitParticles(this, enemyEntity.x, enemyEntity.y - 20, isCritical);
        if (isCritical) EffectsManager.createCriticalFlash(this);
        HitStop.freeze(this, isCritical ? 16 : 8);

        const knockbackDir = enemyEntity.x > playerEntity.x ? 1 : -1;
        enemyEntity.takeDamage(finalDamage, knockbackDir);
        playerEntity.weapon.hitEnemiesThisAttack.add(enemyEntity);
        playerEntity.registerHit();

        // 应用祝福状态效果
        statusEffects.forEach((effect) => enemyEntity.addStatusEffect(effect));
        // 生命偷取
        const lifestealPercent = this.blessingManager.getLifestealPercent();
        if (lifestealPercent > 0) {
            const healAmount = Math.round(finalDamage * lifestealPercent);
            playerEntity.heal(healAmount);
        }

        // 追踪伤害
        this.runManager.addDamageDealt(finalDamage);
    };

    private handleEnemyAttackOverlap = (enemy: any, player: any): void => {
        const enemyEntity = enemy as Enemy;
        const playerEntity = player as Player;

        if (enemyEntity.isDead) return;
        if (playerEntity.isInvincible) return;
        if (!enemyEntity.isAttacking) return;
        if (enemyEntity.hitPlayerThisAttack) return; // 防止同一次攻击多次命中

        const isAttackingTowardsPlayer =
            (enemyEntity.flipX && playerEntity.x < enemyEntity.x) ||
            (!enemyEntity.flipX && playerEntity.x > enemyEntity.x);
        if (!isAttackingTowardsPlayer) return;

        enemyEntity.hitPlayerThisAttack = true;

        const damageReduction = this.blessingManager.getDamageReduction();
        const reducedDamage = Math.round(enemyEntity.attackDamage * (1 - damageReduction));

        CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
        DamageText.create(this, playerEntity.x, playerEntity.y - 30, reducedDamage, DamageType.NORMAL);

        const knockbackDirection = playerEntity.x < enemyEntity.x ? -1 : 1;
        playerEntity.takeDamage(reducedDamage, knockbackDirection);

        this.runManager.addDamageTaken(reducedDamage);
    };

    private handlePlayerEnemyPhysicsCollision = (player: any, enemy: any): void => {
        const playerEntity = player as Player;
        const enemyEntity = enemy as Enemy;

        if (enemyEntity.isDead) return;

        const playerBody = playerEntity.body as Phaser.Physics.Arcade.Body;
        const enemyBody = enemyEntity.body as Phaser.Physics.Arcade.Body;

        const isStomping =
            playerBody.velocity.y > 0 &&
            playerBody.bottom <= enemyBody.top + 20;

        if (isStomping) {
            playerEntity.bounce();
            enemyEntity.takeDamage(playerEntity.attackDamage);
            const bounceMsgDir = playerEntity.x < enemyEntity.x ? -1 : 1;
            playerBody.setVelocityX(bounceMsgDir * 150);
        }
    };

    // ===== Update =====

    update(time: number, delta: number): void {
        if (this.isPaused) return;

        this.player.update(time, delta);

        // 更新敌人
        this.enemies?.getChildren().forEach((enemy) => {
            (enemy as Enemy).update(time, delta, this.player);
        });

        // 攻击检测
        this.checkAttacksByDistance();
        this.checkProjectileHits();
        this.checkPlayerProjectileHits();
        this.checkBossProjectileHits();

        // 检查房间是否清理完毕
        if (this.roomPhase === RoomPhase.COMBAT) {
            this.checkRoomCleared();
        }

        // 调试
        if (this.isDebugMode) {
            this.fpsText?.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
            this.player.updateDebug();
            this.enemies?.getChildren().forEach((enemy) => {
                (enemy as Enemy).updateDebug();
            });
        }

        // 视差
        if (this.sky) this.sky.tilePositionX = this.cameras.main.scrollX * 0.1;
        if (this.mountains) this.mountains.tilePositionX = this.cameras.main.scrollX * 0.2;
        if (this.trees) this.trees.tilePositionX = this.cameras.main.scrollX * 0.5;
    }

    /**
     * 检查所有敌人是否已被消灭
     */
    private checkRoomCleared(): void {
        const aliveCount = this.roomGenerator.getAliveEnemyCount();
        if (aliveCount === 0) {
            this.onRoomCleared();
        }
    }

    // ===== 距离检测（从 GameScene 复用） =====

    private checkAttacksByDistance(): void {
        const playerAttackRange = this.player.weapon.getAttackRange() + 30;

        this.enemies?.getChildren().forEach((enemy) => {
            const enemyEntity = enemy as Enemy;
            if (enemyEntity.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                enemyEntity.x, enemyEntity.y,
            );

            // 玩家近战攻击敌人
            if (
                !this.player.weapon.isRanged() &&
                this.player.weapon.isAttacking &&
                this.player.weapon.canDealDamage &&
                !this.player.weapon.hitEnemiesThisAttack.has(enemyEntity) &&
                distance < playerAttackRange
            ) {
                const isAttackingTowardsEnemy =
                    (this.player.flipX && enemyEntity.x < this.player.x) ||
                    (!this.player.flipX && enemyEntity.x > this.player.x);

                if (isAttackingTowardsEnemy) {
                    const { critChanceBonus, critMultiplierBonus } = this.blessingManager.getCritBonus();
                    const isCritical = Math.random() < (this.player.criticalChance + critChanceBonus);
                    const currentDamage = this.player.getCurrentDamage();
                    const { damage: blessedDamage, effects: distStatusEffects } = this.blessingManager.applyAttackModifiers(currentDamage, this.time.now);
                    const finalDamage = isCritical
                        ? Math.round(blessedDamage * (this.player.criticalMultiplier + critMultiplierBonus))
                        : blessedDamage;

                    CameraShake.shake(this.cameras.main, isCritical ? ShakeIntensity.HEAVY : ShakeIntensity.LIGHT);
                    DamageText.create(this, enemyEntity.x, enemyEntity.y - 30, finalDamage, isCritical ? DamageType.CRITICAL : DamageType.NORMAL);
                    EffectsManager.createSlashEffect(this, (this.player.x + enemyEntity.x) / 2, (this.player.y + enemyEntity.y) / 2 - 10, !this.player.flipX, isCritical);
                    EffectsManager.createHitParticles(this, enemyEntity.x, enemyEntity.y - 20, isCritical);
                    if (isCritical) EffectsManager.createCriticalFlash(this);
                    HitStop.freeze(this, isCritical ? 14 : 6);

                    const knockbackDir = enemyEntity.x > this.player.x ? 1 : -1;
                    enemyEntity.takeDamage(finalDamage, knockbackDir);
                    this.player.weapon.hitEnemiesThisAttack.add(enemyEntity);
                    this.player.registerHit();

                    // 应用祝福状态效果
                    distStatusEffects.forEach((effect) => enemyEntity.addStatusEffect(effect));
                    // 生命偷取
                    const distLifesteal = this.blessingManager.getLifestealPercent();
                    if (distLifesteal > 0) {
                        const healAmount = Math.round(finalDamage * distLifesteal);
                        this.player.heal(healAmount);
                    }

                    this.runManager.addDamageDealt(finalDamage);
                }
            }

            // 敌人近战攻击玩家
            const enemyAttackRange = enemyEntity.getAttackRange() + 10;
            if (
                enemyEntity.isAttacking &&
                !enemyEntity.hitPlayerThisAttack &&
                !this.player.isInvincible &&
                distance < enemyAttackRange
            ) {
                const isAttackingTowardsPlayer =
                    (enemyEntity.flipX && this.player.x < enemyEntity.x) ||
                    (!enemyEntity.flipX && this.player.x > enemyEntity.x);

                if (isAttackingTowardsPlayer) {
                    enemyEntity.hitPlayerThisAttack = true;
                    const distDmgReduction = this.blessingManager.getDamageReduction();
                    const distReducedDamage = Math.round(enemyEntity.attackDamage * (1 - distDmgReduction));
                    CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
                    DamageText.create(this, this.player.x, this.player.y - 30, distReducedDamage, DamageType.NORMAL);
                    const knockbackDirection = this.player.x < enemyEntity.x ? -1 : 1;
                    this.player.takeDamage(distReducedDamage, knockbackDirection);
                    this.runManager.addDamageTaken(distReducedDamage);
                }
            }
        });
    }

    private checkProjectileHits(): void {
        if (this.player.isInvincible) return;

        this.enemies?.getChildren().forEach((enemy) => {
            // 弓箭手投射物
            if (enemy instanceof ArcherEnemy && !enemy.isDead) {
                this.checkEnemyProjectiles(enemy, enemy.projectiles, enemy.attackDamage);
            }
            // 火法师投射物
            if (enemy instanceof FireMageEnemy && !enemy.isDead) {
                this.checkEnemyProjectiles(enemy, enemy.projectiles, enemy.attackDamage);
            }
        });
    }

    /** 通用敌人投射物检测 */
    private checkEnemyProjectiles(
        owner: { destroyProjectile(proj: any): void; attackDamage: number },
        projectiles: (Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image)[],
        damage: number,
    ): void {
        for (const proj of [...projectiles]) {
            if (!proj.active) {
                owner.destroyProjectile(proj);
                continue;
            }

            const worldWidth = this.currentRoomConfig.size.width;
            if (proj.x < 0 || proj.x > worldWidth || proj.y < 0 || proj.y > GAME_HEIGHT + 100) {
                owner.destroyProjectile(proj);
                continue;
            }

            const dx = Math.abs(proj.x - this.player.x);
            const dy = Math.abs(proj.y - this.player.y);
            if (dx < 30 && dy < 35) {
                const projDmgReduction = this.blessingManager.getDamageReduction();
                const projReducedDamage = Math.round(damage * (1 - projDmgReduction));

                CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
                DamageText.create(this, this.player.x, this.player.y - 30, projReducedDamage, DamageType.NORMAL);
                const knockDir = proj.body
                    ? (proj.body as Phaser.Physics.Arcade.Body).velocity.x > 0 ? -1 : 1
                    : 0;
                this.player.takeDamage(projReducedDamage, knockDir);
                owner.destroyProjectile(proj);
                this.runManager.addDamageTaken(projReducedDamage);
            }
        }
    }

    private checkPlayerProjectileHits(): void {
        const weapon = this.player.weapon;
        if (!('projectiles' in weapon)) return;
        const bowWeapon = weapon as BowWeapon;

        for (const proj of [...bowWeapon.projectiles]) {
            if (!proj.active) {
                bowWeapon.destroyProjectile(proj);
                continue;
            }

            this.enemies?.getChildren().forEach((enemy) => {
                const enemyEntity = enemy as Enemy;
                if (enemyEntity.isDead) return;

                const dx = Math.abs(proj.x - enemyEntity.x);
                const dy = Math.abs(proj.y - enemyEntity.y);
                if (dx < 30 && dy < 35) {
                    const { critChanceBonus, critMultiplierBonus } = this.blessingManager.getCritBonus();
                    const isCritical = Math.random() < (this.player.criticalChance + critChanceBonus);
                    const baseDamage = this.player.getCurrentDamage();
                    const { damage: blessedDamage, effects: statusEffects } = this.blessingManager.applyAttackModifiers(baseDamage, this.time.now);
                    const finalDamage = isCritical
                        ? Math.round(blessedDamage * (this.player.criticalMultiplier + critMultiplierBonus))
                        : blessedDamage;

                    CameraShake.shake(this.cameras.main, isCritical ? ShakeIntensity.HEAVY : ShakeIntensity.LIGHT);
                    DamageText.create(this, enemyEntity.x, enemyEntity.y - 30, finalDamage, isCritical ? DamageType.CRITICAL : DamageType.NORMAL);
                    EffectsManager.createHitParticles(this, enemyEntity.x, enemyEntity.y - 20, isCritical);
                    if (isCritical) EffectsManager.createCriticalFlash(this);
                    HitStop.freeze(this, isCritical ? 14 : 6);

                    const knockbackDir = enemyEntity.x > this.player.x ? 1 : -1;
                    enemyEntity.takeDamage(finalDamage, knockbackDir);
                    this.player.registerHit();
                    bowWeapon.destroyProjectile(proj);
                    this.runManager.addDamageDealt(finalDamage);

                    // 应用祝福状态效果
                    statusEffects.forEach((effect) => enemyEntity.addStatusEffect(effect));
                    // 生命偷取
                    const lifestealPercent = this.blessingManager.getLifestealPercent();
                    if (lifestealPercent > 0) {
                        const healAmount = Math.round(finalDamage * lifestealPercent);
                        this.player.heal(healAmount);
                    }
                }
            });
        }
    }

    /**
     * 检测 Boss 岩石投射物是否命中玩家
     */
    private checkBossProjectileHits(): void {
        if (this.player.isInvincible) return;

        this.enemies?.getChildren().forEach((enemy) => {
            const boss = enemy as StoneGolemBoss;
            if (!(boss instanceof StoneGolemBoss) || boss.isDead) return;

            for (const rock of [...boss.rocks]) {
                if (!rock.active) {
                    boss.destroyRock(rock);
                    continue;
                }

                // 超出世界边界销毁
                if (rock.y > GAME_HEIGHT + 50 || rock.x < -50 || rock.x > this.currentRoomConfig.size.width + 50) {
                    boss.destroyRock(rock);
                    continue;
                }

                const dx = Math.abs(rock.x - this.player.x);
                const dy = Math.abs(rock.y - this.player.y);
                if (dx < 30 && dy < 35) {
                    const dmgReduction = this.blessingManager.getDamageReduction();
                    const reducedDamage = Math.round(
                        ((ENEMY_TABLE.stone_golem.extra?.rockDamage as number) || 20) * (1 - dmgReduction),
                    );
                    CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
                    DamageText.create(this, this.player.x, this.player.y - 30, reducedDamage, DamageType.NORMAL);
                    const knockDir = rock.body
                        ? (rock.body as Phaser.Physics.Arcade.Body).velocity.x > 0 ? -1 : 1
                        : 0;
                    this.player.takeDamage(reducedDamage, knockDir);
                    boss.destroyRock(rock);
                    this.runManager.addDamageTaken(reducedDamage);
                }
            }
        });
    }

    /**
     * 处理爆炸虫自爆伤害
     */
    private handleBombExplosion = (data: { x: number; y: number; damage: number; radius: number }): void => {
        if (this.player.isInvincible) return;

        const distToPlayer = Phaser.Math.Distance.Between(data.x, data.y, this.player.x, this.player.y);
        if (distToPlayer <= data.radius) {
            const dmgReduction = this.blessingManager.getDamageReduction();
            const reducedDamage = Math.round(data.damage * (1 - dmgReduction));

            CameraShake.shake(this.cameras.main, ShakeIntensity.HEAVY);
            DamageText.create(this, this.player.x, this.player.y - 30, reducedDamage, DamageType.NORMAL);
            const knockDir = this.player.x < data.x ? -1 : 1;
            this.player.takeDamage(reducedDamage, knockDir);
            this.runManager.addDamageTaken(reducedDamage);
        }
    };

    /**
     * 处理 Boss 地震波伤害
     */
    private handleBossQuake = (data: { x: number; y: number; damage: number; range: number }): void => {
        if (this.player.isInvincible) return;

        const distToPlayer = Phaser.Math.Distance.Between(data.x, data.y, this.player.x, this.player.y);
        // 地震波只对地面上的玩家有效
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        const isOnGround = playerBody.onFloor();

        if (distToPlayer <= data.range && isOnGround) {
            const dmgReduction = this.blessingManager.getDamageReduction();
            const reducedDamage = Math.round(data.damage * (1 - dmgReduction));

            CameraShake.shake(this.cameras.main, ShakeIntensity.HEAVY);
            DamageText.create(this, this.player.x, this.player.y - 30, reducedDamage, DamageType.NORMAL);
            const knockDir = this.player.x < data.x ? -1 : 1;
            this.player.takeDamage(reducedDamage, knockDir);
            this.runManager.addDamageTaken(reducedDamage);
        }
    };

    /**
     * Boss 击败处理
     */
    private handleBossDefeated = (_data: { bossId: string; bossName: string }): void => {
        // 记录 Boss 击败
        SaveManager.recordBossDefeat(_data.bossId);

        // Boss 击败后，推进到下一个区域或通关
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

    /** 处理动态敌人生成（史莱姆分裂） */
    private handleEnemySpawned = (enemy: Enemy): void => {
        if (!this.enemies) return;
        this.enemies.add(enemy);
        enemy.setCollideWorldBounds(true);
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

    // ===== 系统 =====

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.anims.pauseAll();
            this.scene.get(SCENES.UI).events.emit('show-pause-menu');
        } else {
            this.physics.resume();
            this.anims.resumeAll();
            this.scene.get(SCENES.UI).events.emit('hide-pause-menu');
        }
    }

    private toggleDebugMode(): void {
        this.isDebugMode = !this.isDebugMode;
        if (this.isDebugMode) {
            this.player.enableDebug();
            this.enemies?.getChildren().forEach((e) => (e as Enemy).enableDebug());
            this.fpsText?.setVisible(true);
        } else {
            this.player.disableDebug();
            this.enemies?.getChildren().forEach((e) => (e as Enemy).disableDebug());
            this.fpsText?.setVisible(false);
        }
    }

    private handlePlayerDeath(): void {
        // 检查死亡抗拒（复活）
        if (this.runManager.useDeathDefiance()) {
            this.player.isDead = false;
            this.player.health = Math.round(this.player.maxHealth * 0.3);
            (this.player.body as Phaser.Physics.Arcade.Body).enable = true;
            this.player.removeInvincible('death');
            this.player.addInvincible('revive');
            this.events.emit('player-health-changed', this.player.health, this.player.maxHealth);
            this.time.delayedCall(2000, () => {
                this.player.removeInvincible('revive');
            });
            console.log('[RunScene] 死亡抗拒触发！剩余:', this.runManager.getState().deathDefiances);
            return;
        }

        // 防止重复处理
        if (this.roomPhase === RoomPhase.TRANSITION) return;

        // 防止玩家死亡后仍触发房间清理 → 祝福选择的竞态条件
        this.roomPhase = RoomPhase.TRANSITION;

        // 如果祝福选择场景已经在运行，直接关闭它
        if (this.scene.isActive(SCENES.BLESSING)) {
            this.scene.stop(SCENES.BLESSING);
            // 恢复被 showBlessingSelect 暂停的状态
            this.physics.resume();
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }
        }

        const finalState = this.runManager.endRun();
        this.time.delayedCall(2000, () => {
            this.roomGenerator.cleanup();
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.DEATH, { runState: finalState });
        });
    }
}
