/**
 * 主游戏场景
 * 包含游戏核心逻辑：地图、玩家、敌人、碰撞等
 */
import Phaser from 'phaser';
import {
    SCENES,
    GAME_WIDTH,
    GAME_HEIGHT,
    DEPTH,
    TILE_SIZE,
    ASSETS,
    // PLAYER_CONFIG, // Unused
} from '../utils/Constants';
import { Player } from '../entities/Player';
import { SkeletonEnemy } from '../entities/SkeletonEnemy';
import { InputController } from '../systems/InputController';
import { CameraShake, ShakeIntensity } from '../utils/CameraShake';
import { DamageText, DamageType } from '../ui/DamageText';
import { PlayerStatsPanel } from '../ui/PlayerStatsPanel';
import { DecorationManager } from '../systems/DecorationManager';
import { LEVEL_1_DECORATIONS } from '../config/LevelConfig';
import { HitStop } from '../utils/HitStop';

export class GameScene extends Phaser.Scene {
    // 玩家实例
    public player!: Player;

    // 输入控制器
    public inputController!: InputController;

    // 敌人组（物理组）
    public enemies!: Phaser.Physics.Arcade.Group;

    // 地面平台组
    public platforms!: Phaser.Physics.Arcade.StaticGroup;

    // 装饰物管理器
    private decorationManager!: DecorationManager;

    // 背景层
    private sky?: Phaser.GameObjects.TileSprite;
    private mountains?: Phaser.GameObjects.TileSprite;
    private trees?: Phaser.GameObjects.TileSprite;

    // 是否暂停
    private isPaused: boolean = false;

    // 调试模式
    private isDebugMode: boolean = false;
    private fpsText?: Phaser.GameObjects.Text;

    // 玩家与敌人的碰撞器（用于冲刺时禁用）
    public playerEnemyCollider?: Phaser.Physics.Arcade.Collider;

    // 玩家数值面板
    private statsPanel?: PlayerStatsPanel;

    constructor() {
        super({ key: SCENES.GAME });
    }

    create(): void {
        // 淡入效果
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // 创建输入控制器
        this.inputController = new InputController(this);

        // 创建关卡
        this.createLevel();

        // 创建玩家
        this.createPlayer();

        // 创建敌人
        this.createEnemies();

        // 设置碰撞
        this.setupCollisions();

        // 设置相机跟随
        this.setupCamera();

        // 监听暂停事件
        this.input.keyboard?.on('keydown-ESC', () => {
            this.togglePause();
        });

        // 监听调试模式切换
        this.input.keyboard?.on('keydown-P', () => {
            this.toggleDebugMode();
        });

        // 监听数值面板切换
        this.input.keyboard?.on('keydown-C', () => {
            this.statsPanel?.toggle();
        });

        // 创建玩家数值面板
        this.statsPanel = new PlayerStatsPanel(this, this.player);

        // 创建 FPS 文本（固定在屏幕右上角）
        const screenWidth = this.cameras.main.width;
        this.fpsText = this.add.text(screenWidth - 100, 10, 'FPS: 0', {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 },
        });
        this.fpsText.setDepth(2000);
        this.fpsText.setScrollFactor(0); // 固定在摄像机视口，不跟随世界移动
        this.fpsText.setVisible(false);

        // 监听玩家死亡事件
        this.events.on('player-died', this.handlePlayerDeath, this);
    }

    /**
     * 创建关卡地图
     */
    private createLevel(): void {
        // 创建静态平台组
        this.platforms = this.physics.add.staticGroup();

        // 背景色
        this.cameras.main.setBackgroundColor('#87CEEB'); // 天蓝色

        // 创建视差背景
        this.createParallaxBackground();

        // 创建地面 - 使用草地素材
        const groundY = GAME_HEIGHT - TILE_SIZE;
        const numTiles = Math.ceil((GAME_WIDTH * 3) / TILE_SIZE); // 地图宽度是屏幕的3倍

        for (let i = 0; i < numTiles; i++) {
            // 随机选择草地素材 (1-11)
            const tileIndex = Phaser.Math.Between(1, 11);
            const ground = this.platforms.create(
                i * TILE_SIZE + TILE_SIZE / 2,
                groundY + TILE_SIZE / 2,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;

            ground.setScale(0.5); // 根据素材大小调整
            ground.refreshBody();
        }

        // 创建一些浮空平台
        this.createPlatform(300, GAME_HEIGHT - 150, 5);
        this.createPlatform(600, GAME_HEIGHT - 250, 4);
        this.createPlatform(900, GAME_HEIGHT - 180, 6);
        this.createPlatform(1200, GAME_HEIGHT - 300, 5);
        this.createPlatform(1500, GAME_HEIGHT - 200, 4);
        this.createPlatform(1800, GAME_HEIGHT - 280, 5);

        // 设置世界边界
        // 设置世界边界 (增加一点宽度以确保能触发胜利)
        this.physics.world.setBounds(0, 0, 3200, GAME_HEIGHT);

        // 创建装饰物管理器
        this.decorationManager = new DecorationManager(this);
        this.spawnDecorations();
    }

    /**
     * 创建视差背景
     */
    private createParallaxBackground(): void {
        // 天空 (最远)
        this.sky = this.add.tileSprite(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT,
            ASSETS.SKY_BACKGROUND,
        );
        this.sky.setOrigin(0, 0);
        this.sky.setScrollFactor(0);
        this.sky.setDepth(DEPTH.BACKGROUND);

        // 远山 (中远)
        this.mountains = this.add.tileSprite(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT,
            ASSETS.MOUNTAINS_BACKGROUND,
        );
        this.mountains.setOrigin(0, 0);
        this.mountains.setScrollFactor(0);
        this.mountains.setDepth(DEPTH.BACKGROUND + 1);

        // 树林 (近景)
        this.trees = this.add.tileSprite(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT,
            ASSETS.TREES_BACKGROUND,
        );
        this.trees.setOrigin(0, 0);
        this.trees.setScrollFactor(0);
        this.trees.setDepth(DEPTH.BACKGROUND + 2);
    }

    /**
     * 生成装饰物
     */
    private spawnDecorations(): void {
        LEVEL_1_DECORATIONS.forEach((data) => {
            const decoration = this.decorationManager.createDecoration(
                data.x,
                data.y,
                data.type,
                data.depth,
            );
            if (decoration) {
                decoration.setData('isDecoration', true); // 标记以便清理
                if (data.scale) decoration.setScale(data.scale); // 额外叠加缩放
                if (data.flipX)
                    decoration.setScale(
                        decoration.scaleX * -1,
                        decoration.scaleY,
                    ); // 翻转
            }
        });
    }

    /**
     * 创建浮空平台
     */
    private createPlatform(x: number, y: number, length: number): void {
        for (let i = 0; i < length; i++) {
            const tileIndex = Phaser.Math.Between(1, 11);
            const tile = this.platforms.create(
                x + i * TILE_SIZE * 0.5,
                y,
                `${ASSETS.TILESET_GRASS}-${tileIndex}`,
            ) as Phaser.Physics.Arcade.Sprite;

            tile.setScale(0.5);
            tile.setDepth(DEPTH.TILEMAP); // 确保在背景之上
            tile.refreshBody();
        }
        console.log(
            `[GameScene] Created platform at (${x}, ${y}) with length ${length}`,
        );
    }

    /**
     * 创建玩家
     */
    private createPlayer(): void {
        this.player = new Player(this, 100, GAME_HEIGHT - 150);
        this.player.setDepth(DEPTH.PLAYER);
    }

    /**
     * 创建敌人
     */
    private createEnemies(): void {
        // ✅ 使用physics.add.group创建物理组，才能正确处理overlap
        this.enemies = this.physics.add.group();

        // 在不同位置生成骷髅敌人
        const enemyPositions = [
            { x: 400, y: GAME_HEIGHT - 150 },
            { x: 700, y: GAME_HEIGHT - 300 },
            { x: 1000, y: GAME_HEIGHT - 150 },
            { x: 1300, y: GAME_HEIGHT - 350 },
            { x: 1600, y: GAME_HEIGHT - 150 },
            { x: 1900, y: GAME_HEIGHT - 330 },
        ];

        enemyPositions.forEach((pos) => {
            const enemy = new SkeletonEnemy(this, pos.x, pos.y);
            enemy.setDepth(DEPTH.ENEMIES);
            this.enemies.add(enemy);
        });
    }

    /**
     * 设置碰撞检测
     */
    private setupCollisions(): void {
        console.log('[Debug] Setting up collisions');
        console.log('[Debug] Player:', this.player);
        console.log('[Debug] Enemies:', this.enemies);
        console.log('[Debug] Enemies children:', this.enemies?.getChildren());

        // 玩家与平台碰撞
        this.physics.add.collider(this.player, this.platforms);

        // 敌人与平台碰撞
        this.physics.add.collider(this.enemies, this.platforms);

        // 玩家与敌人的物理碰撞（仅处理踩头，不处理伤害）
        this.playerEnemyCollider = this.physics.add.collider(
            this.player,
            this.enemies,
            this.handlePlayerEnemyPhysicsCollision,
            undefined,
            this,
        );
        console.log('[Debug] Collider created:', this.playerEnemyCollider);

        // 玩家攻击判定（使用overlap，无物理推力）
        const playerAttackOverlap = this.physics.add.overlap(
            this.player,
            this.enemies,
            this.handlePlayerAttackOverlap,
            undefined,
            this,
        );
        console.log(
            '[Debug] Player attack overlap created:',
            playerAttackOverlap,
        );

        // 敌人攻击判定（使用overlap，无物理推力）
        const enemyAttackOverlap = this.physics.add.overlap(
            this.enemies,
            this.player,
            this.handleEnemyAttackOverlap,
            undefined,
            this,
        );
        console.log(
            '[Debug] Enemy attack overlap created:',
            enemyAttackOverlap,
        );
    }

    /**
     * 处理玩家攻击overlap（无物理推力）
     */
    private handlePlayerAttackOverlap = (player: any, enemy: any): void => {
        console.log('[Debug] Overlap triggered!'); // 1. 确认overlap被调用

        const playerEntity = player as Player;
        const enemyEntity = enemy as SkeletonEnemy;

        if (enemyEntity.isDead) {
            console.log('[Debug] Enemy is dead, skipping');
            return;
        }

        if (!playerEntity.isAttacking) {
            console.log('[Debug] Player not attacking, skipping');
            return;
        }

        if (!playerEntity.canDealDamage) {
            console.log('[Debug] Player cannot deal damage yet, skipping');
            return;
        }

        console.log('[Debug] Player IS attacking!'); // 确认攻击状态

        // 检查攻击方向是否正确
        const isAttackingTowardsEnemy =
            (playerEntity.flipX && enemyEntity.x < playerEntity.x) ||
            (!playerEntity.flipX && enemyEntity.x > playerEntity.x);

        console.log('[Debug] Attack direction check:', {
            playerFlipX: playerEntity.flipX,
            playerX: playerEntity.x,
            enemyX: enemyEntity.x,
            isTowards: isAttackingTowardsEnemy,
        });

        if (!isAttackingTowardsEnemy) {
            console.log('[Debug] Wrong attack direction, skipping');
            return;
        }

        // 防止重复伤害：每次攻击只能命中一次
        if (playerEntity.hasHitThisAttack) {
            console.log('[Debug] Already hit this attack, skipping');
            return;
        }

        console.log('[Attack] Player hit enemy'); // 成功！

        // 暴击判定
        const isCritical = Math.random() < playerEntity.criticalChance;
        const currentDamage = playerEntity.getCurrentDamage();
        const finalDamage = isCritical
            ? Math.round(currentDamage * playerEntity.criticalMultiplier)
            : currentDamage;

        // 触发屏幕震动（暴击时使用重击震动）
        CameraShake.shake(
            this.cameras.main,
            isCritical ? ShakeIntensity.HEAVY : ShakeIntensity.LIGHT,
        );

        // 显示伤害数字（暴击时使用特殊颜色）
        DamageText.create(
            this,
            enemyEntity.x,
            enemyEntity.y - 30,
            finalDamage,
            isCritical ? DamageType.CRITICAL : DamageType.NORMAL,
        );

        if (isCritical) {
            console.log(`[Attack] CRITICAL HIT! Damage: ${finalDamage}`);
        }

        // 顿帧效果
        HitStop.freeze(this, isCritical ? 16 : 8);

        enemyEntity.takeDamage(finalDamage);
        playerEntity.hasHitThisAttack = true;
    };

    /**
     * 处理敌人攻击overlap（敌人攻击玩家）
     */
    private handleEnemyAttackOverlap = (enemy: any, player: any): void => {
        console.log('[Debug] Enemy attack overlap triggered');

        const enemyEntity = enemy as SkeletonEnemy;
        const playerEntity = player as Player;

        if (enemyEntity.isDead) {
            console.log('[Debug] Enemy is dead, skipping');
            return;
        }

        if (playerEntity.isInvincible) {
            console.log('[Debug] Player is invincible, skipping');
            return;
        }

        if (!enemyEntity.isAttacking) {
            console.log('[Debug] Enemy not attacking, skipping');
            return;
        }

        console.log('[Debug] Enemy IS attacking!');

        // 检查攻击方向是否正确
        const isAttackingTowardsPlayer =
            (enemyEntity.flipX && playerEntity.x < enemyEntity.x) ||
            (!enemyEntity.flipX && playerEntity.x > enemyEntity.x);

        console.log('[Debug] Enemy attack direction check:', {
            enemyFlipX: enemyEntity.flipX,
            enemyX: enemyEntity.x,
            playerX: playerEntity.x,
            isTowards: isAttackingTowardsPlayer,
        });

        if (!isAttackingTowardsPlayer) {
            console.log('[Debug] Wrong enemy attack direction, skipping');
            return;
        }

        console.log('[Attack] Enemy hit player!');

        // 触发屏幕震动（中击 - 被敌人攻击比玩家攻击震动更强）
        CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);

        // 显示伤害数字
        DamageText.create(
            this,
            playerEntity.x,
            playerEntity.y - 30,
            enemyEntity.attackDamage,
            DamageType.NORMAL,
        );

        const knockbackDirection = playerEntity.x < enemyEntity.x ? -1 : 1;
        playerEntity.takeDamage(enemyEntity.attackDamage, knockbackDirection);
    };

    /**
     * 处理玩家与敌人的物理碰撞
     */
    private handlePlayerEnemyPhysicsCollision = (
        player: any,
        enemy: any,
    ): void => {
        const playerEntity = player as Player;
        const enemyEntity = enemy as SkeletonEnemy;

        if (enemyEntity.isDead) return;

        const playerBody = playerEntity.body as Phaser.Physics.Arcade.Body;
        const enemyBody = enemyEntity.body as Phaser.Physics.Arcade.Body;

        // 踩头检测：玩家在下落且位置高于敌人
        const isStomping =
            playerBody.velocity.y > 0 &&
            playerBody.bottom <= enemyBody.top + 20;

        if (isStomping) {
            // 踩头成功
            console.log('[Collision] Player stomping enemy');
            playerEntity.bounce();
            enemyEntity.takeDamage(playerEntity.attackDamage);

            // 横向弹开至最近的一侧
            const bounceMsgDir = playerEntity.x < enemyEntity.x ? -1 : 1;
            playerBody.setVelocityX(bounceMsgDir * 150);
            return; // 踩头后不再处理其他碰撞
        }

        // 不再处理攻击和碰撞伤害（由overlap处理）
        // 物理碰撞只用于物理交互，不造成伤害
    };

    /**
     * 设置相机
     */
    private setupCamera(): void {
        // 相机跟随玩家
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 设置相机边界
        this.cameras.main.setBounds(0, 0, 3200, GAME_HEIGHT);

        // 设置死区（玩家可以在屏幕中心附近移动而相机不跟随）
        this.cameras.main.setDeadzone(200, 100);
    }

    /**
     * 切换暂停状态
     */
    private togglePause(): void {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
            this.anims.pauseAll(); // 暂停所有动画
            // this.scene.pause(); // 不要完全暂停场景，否则无法接收输入
            // 通知 UI 场景显示暂停菜单
            this.scene.get(SCENES.UI).events.emit('show-pause-menu');
        } else {
            this.physics.resume();
            this.anims.resumeAll(); // 恢复所有动画
            // this.scene.resume();
            this.scene.get(SCENES.UI).events.emit('hide-pause-menu');
        }
    }

    /**
     * 切换调试模式
     */
    private toggleDebugMode(): void {
        this.isDebugMode = !this.isDebugMode;

        if (this.isDebugMode) {
            console.log('[Debug] 调试模式已启用');
            // 启用玩家调试
            this.player.enableDebug();

            // 启用所有敌人调试
            this.enemies.getChildren().forEach((enemy) => {
                (enemy as SkeletonEnemy).enableDebug();
            });

            // 显示 FPS
            this.fpsText?.setVisible(true);
        } else {
            console.log('[Debug] 调试模式已关闭');
            // 禁用玩家调试
            this.player.disableDebug();

            // 禁用所有敌人调试
            this.enemies.getChildren().forEach((enemy) => {
                (enemy as SkeletonEnemy).disableDebug();
            });

            // 隐藏 FPS
            this.fpsText?.setVisible(false);
        }
    }

    /**
     * 每帧更新
     */
    update(time: number, delta: number): void {
        if (this.isPaused) return;

        // 更新玩家
        this.player.update(time, delta);

        // 检查胜利条件
        if (this.player.x > 3000) {
            this.scene.start(SCENES.WIN);
        }

        // 更新所有敌人
        this.enemies.getChildren().forEach((enemy) => {
            (enemy as SkeletonEnemy).update(time, delta, this.player);
        });

        // 基于距离的攻击检测（替代overlap，因为Collider会阻止重叠）
        this.checkAttacksByDistance();

        // 更新调试信息
        if (this.isDebugMode) {
            // 更新 FPS
            const fps = Math.round(this.game.loop.actualFps);
            this.fpsText?.setText(`FPS: ${fps}`);

            // 更新玩家调试信息
            this.player.updateDebug();

            // 更新所有敌人调试信息
            this.enemies.getChildren().forEach((enemy) => {
                (enemy as SkeletonEnemy).updateDebug();
            });
        }

        // 更新背景视差
        if (this.sky) {
            this.sky.tilePositionX = this.cameras.main.scrollX * 0.1;
        }
        if (this.mountains) {
            this.mountains.tilePositionX = this.cameras.main.scrollX * 0.2;
        }
        if (this.trees) {
            this.trees.tilePositionX = this.cameras.main.scrollX * 0.5;
        }

        // 调试：打印玩家坐标
        // console.log(`Player X: ${this.player.x}`);
    }

    /**
     * 基于距离的攻击检测
     */
    private checkAttacksByDistance(): void {
        const attackRange = 60; // 攻击距离范围

        this.enemies.getChildren().forEach((enemy) => {
            const enemyEntity = enemy as SkeletonEnemy;
            if (enemyEntity.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemyEntity.x,
                enemyEntity.y,
            );

            // 玩家攻击敌人
            if (
                this.player.isAttacking &&
                this.player.canDealDamage && // 添加伤害判定条件
                !this.player.hasHitThisAttack &&
                distance < attackRange
            ) {
                // 检查攻击方向
                const isAttackingTowardsEnemy =
                    (this.player.flipX && enemyEntity.x < this.player.x) ||
                    (!this.player.flipX && enemyEntity.x > this.player.x);

                if (isAttackingTowardsEnemy) {
                    console.log('[Attack] Player hit enemy (distance check)');

                    // 暴击判定
                    const isCritical =
                        Math.random() < this.player.criticalChance;
                    const currentDamage = this.player.getCurrentDamage();
                    const finalDamage = isCritical
                        ? Math.round(
                              currentDamage * this.player.criticalMultiplier,
                          )
                        : currentDamage;

                    // 触发屏幕震动（暴击时使用重击震动）
                    CameraShake.shake(
                        this.cameras.main,
                        isCritical
                            ? ShakeIntensity.HEAVY
                            : ShakeIntensity.LIGHT,
                    );

                    // 显示伤害数字（暴击时使用特殊颜色）
                    DamageText.create(
                        this,
                        enemyEntity.x,
                        enemyEntity.y - 30,
                        finalDamage,
                        isCritical ? DamageType.CRITICAL : DamageType.NORMAL,
                    );

                    if (isCritical) {
                        console.log(
                            `[Attack] CRITICAL HIT! Damage: ${finalDamage}`,
                        );
                    }

                    // 顿帧效果 - 暂时屏蔽，因为会导致卡死
                    // HitStop.freeze(this, isCritical ? 16 : 8);

                    // 传递击退方向：敌人被击退的方向（远离玩家）
                    const knockbackDir = enemyEntity.x > this.player.x ? 1 : -1;
                    enemyEntity.takeDamage(finalDamage, knockbackDir);
                    this.player.hasHitThisAttack = true;
                }
            }

            // 敌人攻击玩家
            if (
                enemyEntity.isAttacking &&
                !this.player.isInvincible &&
                distance < attackRange
            ) {
                // 检查攻击方向
                const isAttackingTowardsPlayer =
                    (enemyEntity.flipX && this.player.x < enemyEntity.x) ||
                    (!enemyEntity.flipX && this.player.x > enemyEntity.x);

                if (isAttackingTowardsPlayer) {
                    console.log('[Attack] Enemy hit player (distance check)');

                    // 触发屏幕震动（中击）
                    CameraShake.shake(this.cameras.main, ShakeIntensity.MEDIUM);

                    // 显示伤害数字
                    DamageText.create(
                        this,
                        this.player.x,
                        this.player.y - 30,
                        enemyEntity.attackDamage,
                        DamageType.NORMAL,
                    );

                    const knockbackDirection =
                        this.player.x < enemyEntity.x ? -1 : 1;
                    this.player.takeDamage(
                        enemyEntity.attackDamage,
                        knockbackDirection,
                    );
                }
            }
        });
    }
    /**
     * 处理玩家死亡
     */
    private handlePlayerDeath(): void {
        this.time.delayedCall(2000, () => {
            this.scene.start(SCENES.GAME_OVER);
        });
    }
}
