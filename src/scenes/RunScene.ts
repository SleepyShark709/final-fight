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
    ENEMY_CONFIG,
} from '@/utils/Constants';
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
import { CAVERN_COMBAT_ROOMS } from '@/data/rooms/cavern/index';

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
        this.runManager = new RunManager();
        this.runManager.startRun();
        this.roomGenerator = new RoomGenerator(this);

        // 输入
        this.inputController = new InputController(this);

        // 背景（持久化，不随房间清理）
        this.createParallaxBackground();

        // 创建玩家
        this.createPlayer();

        // 加载第一个房间
        this.loadRoom(this.pickRoom());

        // 监听键位
        this.setupKeys();

        // UI
        this.statsPanel = new PlayerStatsPanel(this, this.player);
        this.createFpsText();
        this.createRoomInfoText();

        // 监听玩家死亡
        this.events.on('player-died', this.handlePlayerDeath, this);

        // 启动 UI 场景
        this.scene.launch(SCENES.UI, { parentScene: SCENES.RUN });
    }

    // ===== 房间管理 =====

    /**
     * 随机选一个当前区域的房间模板
     */
    private pickRoom(): RoomConfig {
        // 目前只有石窟区域
        const rooms = CAVERN_COMBAT_ROOMS;
        return rooms[Phaser.Math.Between(0, rooms.length - 1)];
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
     * 房间清理完毕，创建出口
     */
    private onRoomCleared(): void {
        this.roomPhase = RoomPhase.CLEARED;
        console.log('[RunScene] 房间已清理！');

        // 在出口位置创建可交互区域
        const exitData = this.currentRoomConfig.exits[0];
        if (exitData) {
            this.exitZone = this.add.zone(exitData.x, exitData.y, 60, 80);
            this.physics.add.existing(this.exitZone, true); // static body

            // 可视化出口提示
            const exitText = this.add.text(exitData.x, exitData.y - 60, '▶ 出口', {
                fontSize: '16px',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 3,
            });
            exitText.setOrigin(0.5);
            exitText.setDepth(DEPTH.UI);

            // 出口闪烁
            this.tweens.add({
                targets: exitText,
                alpha: 0.3,
                duration: 600,
                yoyo: true,
                repeat: -1,
            });

            // 玩家碰到出口时触发过渡
            this.physics.add.overlap(this.player, this.exitZone, () => {
                if (this.roomPhase !== RoomPhase.CLEARED) return;
                this.roomPhase = RoomPhase.TRANSITION;
                exitText.destroy();
                this.transitionToNextRoom();
            });
        }
    }

    /**
     * 过渡到下一个房间
     */
    private transitionToNextRoom(): void {
        const { isBossRoom } = this.runManager.advanceRoom();

        if (isBossRoom) {
            // TODO: 加载 Boss 房间
            // 暂时视为通关
            this.handleRunComplete();
            return;
        }

        // 淡出 → 加载新房间 → 淡入
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.loadRoom(this.pickRoom());
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
        this.cameras.main.setBackgroundColor('#2a1a3a'); // 石窟暗紫色

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

        const isCritical = Math.random() < playerEntity.criticalChance;
        const currentDamage = playerEntity.getCurrentDamage();
        const finalDamage = isCritical
            ? Math.round(currentDamage * playerEntity.criticalMultiplier)
            : currentDamage;

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

        // 追踪伤害
        this.runManager.addDamageDealt(finalDamage);
    };

    private handleEnemyAttackOverlap = (enemy: any, player: any): void => {
        const enemyEntity = enemy as Enemy;
        const playerEntity = player as Player;

        if (enemyEntity.isDead) return;
        if (playerEntity.isInvincible) return;
        if (!enemyEntity.isAttacking) return;

        const isAttackingTowardsPlayer =
            (enemyEntity.flipX && playerEntity.x < enemyEntity.x) ||
            (!enemyEntity.flipX && playerEntity.x > enemyEntity.x);
        if (!isAttackingTowardsPlayer) return;

        CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
        DamageText.create(this, playerEntity.x, playerEntity.y - 30, enemyEntity.attackDamage, DamageType.NORMAL);

        const knockbackDirection = playerEntity.x < enemyEntity.x ? -1 : 1;
        playerEntity.takeDamage(enemyEntity.attackDamage, knockbackDirection);

        this.runManager.addDamageTaken(enemyEntity.attackDamage);
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
                    const isCritical = Math.random() < this.player.criticalChance;
                    const currentDamage = this.player.getCurrentDamage();
                    const finalDamage = isCritical
                        ? Math.round(currentDamage * this.player.criticalMultiplier)
                        : currentDamage;

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
                    this.runManager.addDamageDealt(finalDamage);
                }
            }

            // 敌人近战攻击玩家
            const enemyAttackRange = ENEMY_CONFIG.skeleton.attackRange + 10;
            if (
                enemyEntity.isAttacking &&
                !this.player.isInvincible &&
                distance < enemyAttackRange
            ) {
                const isAttackingTowardsPlayer =
                    (enemyEntity.flipX && this.player.x < enemyEntity.x) ||
                    (!enemyEntity.flipX && this.player.x > enemyEntity.x);

                if (isAttackingTowardsPlayer) {
                    CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
                    DamageText.create(this, this.player.x, this.player.y - 30, enemyEntity.attackDamage, DamageType.NORMAL);
                    const knockbackDirection = this.player.x < enemyEntity.x ? -1 : 1;
                    this.player.takeDamage(enemyEntity.attackDamage, knockbackDirection);
                    this.runManager.addDamageTaken(enemyEntity.attackDamage);
                }
            }
        });
    }

    private checkProjectileHits(): void {
        if (this.player.isInvincible) return;

        this.enemies?.getChildren().forEach((enemy) => {
            const archer = enemy as ArcherEnemy;
            if (!(archer instanceof ArcherEnemy) || archer.isDead) return;

            for (const proj of [...archer.projectiles]) {
                if (!proj.active) {
                    archer.destroyProjectile(proj);
                    continue;
                }

                const worldWidth = this.currentRoomConfig.size.width;
                if (proj.x < 0 || proj.x > worldWidth || proj.y < 0 || proj.y > GAME_HEIGHT + 100) {
                    archer.destroyProjectile(proj);
                    continue;
                }

                const dx = Math.abs(proj.x - this.player.x);
                const dy = Math.abs(proj.y - this.player.y);
                if (dx < 30 && dy < 35) {
                    CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);
                    DamageText.create(this, this.player.x, this.player.y - 30, archer.attackDamage, DamageType.NORMAL);
                    const knockDir = proj.body
                        ? (proj.body as Phaser.Physics.Arcade.Body).velocity.x > 0 ? -1 : 1
                        : 0;
                    this.player.takeDamage(archer.attackDamage, knockDir);
                    archer.destroyProjectile(proj);
                    this.runManager.addDamageTaken(archer.attackDamage);
                }
            }
        });
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
                    const isCritical = Math.random() < this.player.criticalChance;
                    const baseDamage = this.player.getCurrentDamage();
                    const finalDamage = isCritical
                        ? Math.round(baseDamage * this.player.criticalMultiplier)
                        : baseDamage;

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
                }
            });
        }
    }

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
        const finalState = this.runManager.endRun();
        this.time.delayedCall(2000, () => {
            this.roomGenerator.cleanup();
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.DEATH, { runState: finalState });
        });
    }
}
