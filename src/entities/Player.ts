/**
 * 玩家类
 * 处理玩家的移动、跳跃、攻击等行为
 */
import Phaser from 'phaser';
import {
    PLAYER_CONFIG,
    CONTROLS,
    // DEPTH, // Unused
    PLAYER_ATTACK_TYPES,
} from '../utils/Constants';
import { GameScene } from '../scenes/GameScene';

// 玩家状态枚举
export enum PlayerState {
    IDLE = 'idle',
    RUN = 'run',
    JUMP = 'jump',
    ATTACK = 'attack',
    HURT = 'hurt',
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    // 生命值
    public health: number;
    public maxHealth: number;

    // 攻击属性
    public attackDamage: number;
    public criticalChance: number; // 暴击率
    public criticalMultiplier: number; // 暴击伤害倍率
    public isAttacking: boolean = false;
    public hasHitThisAttack: boolean = false;
    public canDealDamage: boolean = false; // 是否可以造成伤害（动画播放到一定程度后才为true）

    // 受击硬直状态
    private isStunned: boolean = false;

    // 无敌状态
    public isInvincible: boolean = false;

    // 当前状态
    private currentState: PlayerState = PlayerState.IDLE;

    // 攻击冷却
    private canAttack: boolean = true;

    // 面向方向 (1: 右, -1: 左)
    // private facingDirection: number = 1; // Unused

    // 输入按键
    private keys!: {
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        jump: Phaser.Input.Keyboard.Key;
        attack: Phaser.Input.Keyboard.Key;
        skill: Phaser.Input.Keyboard.Key;
    };

    // 冲刺状态
    private isDashing: boolean = false;
    private canDash: boolean = true;
    private dashDirection: number = 1;

    // 连击系统
    private comboCount: number = 0;
    private lastAttackTime: number = 0;
    private readonly COMBO_WINDOW: number = 1000; // 连击有效窗口期
    private damageMultiplier: number = 1.0;

    // 调试模式
    private debugGraphics?: Phaser.GameObjects.Graphics;
    private debugText?: Phaser.GameObjects.Text;

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'player-idle-0');

        // 初始化属性
        this.health = PLAYER_CONFIG.maxHealth;
        this.maxHealth = PLAYER_CONFIG.maxHealth;
        this.attackDamage = PLAYER_CONFIG.attackDamage;
        this.criticalChance = PLAYER_CONFIG.criticalChance;
        this.criticalMultiplier = PLAYER_CONFIG.criticalMultiplier;

        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 设置物理属性
        this.setCollideWorldBounds(true);
        this.setBounce(0);
        this.setDrag(500, 0);

        // 设置缩放（使用配置中的值）
        this.setScale(PLAYER_CONFIG.scale);

        // 设置碰撞体积（基于100*75的素材比例）
        this.setSize(
            PLAYER_CONFIG.collisionWidth,
            PLAYER_CONFIG.collisionHeight,
        );
        this.setOffset(PLAYER_CONFIG.offsetX, PLAYER_CONFIG.offsetY);

        // 设置不可推动（防止被敌人推着走）
        (this.body as Phaser.Physics.Arcade.Body).pushable = false;

        // 初始化输入
        this.setupInput(scene);

        // 播放待机动画
        this.play('player-idle');
    }

    /**
     * 设置输入按键
     */
    private setupInput(scene: Phaser.Scene): void {
        const keyboard = scene.input.keyboard;
        if (!keyboard) return;

        this.keys = {
            left: keyboard.addKey(CONTROLS.LEFT),
            right: keyboard.addKey(CONTROLS.RIGHT),
            jump: keyboard.addKey(CONTROLS.JUMP),
            attack: keyboard.addKey(CONTROLS.ATTACK),
            skill: keyboard.addKey(CONTROLS.SKILL),
        };
    }

    /**
     * 受到攻击/击退
     * @param direction 击退方向 (1 或 -1)
     */
    public hit(direction: number): void {
        if (this.isInvincible) return;

        this.currentState = PlayerState.HURT;
        // 无敌状态在 takeDamage 里设置，或者这里
        // 这里主要处理物理和视觉

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(direction * PLAYER_CONFIG.knockbackForce);
        body.setVelocityY(-200); // 给一点向上的力，避免地面摩擦

        // 变红反馈
        this.setTint(0xff0000);

        // 播放受伤动画（如果没有专用动画，暂停在当前帧或播放特定帧）
        // 这里我们要防止它切回 run/idle

        this.scene.time.delayedCall(300, () => {
            this.clearTint();
            // 恢复控制
            if (this.health > 0) {
                this.currentState = PlayerState.IDLE;
            }
        });
    }

    /**
     * 获取当前攻击伤害（包含连击加成）
     */
    public getCurrentDamage(): number {
        return Math.round(this.attackDamage * this.damageMultiplier);
    }

    /**
     * 每帧更新
     */
    update(_time: number, _delta: number): void {
        // 处理冲刺输入（冲刺优先级最高）
        if (Phaser.Input.Keyboard.JustDown(this.keys.skill)) {
            this.handleDash();
        }

        // 如果正在冲刺，不处理其他输入
        if (this.isDashing) return;

        // 如果正在攻击或受伤，不处理移动
        if (this.isAttacking || this.currentState === PlayerState.HURT) return;

        // 处理移动输入
        this.handleMovement();

        // 处理跳跃输入
        this.handleJump();

        // 处理攻击输入
        this.handleAttack();

        // 更新动画状态
        this.updateAnimation();
    }

    /**
     * 处理移动
     */
    private handleMovement(): void {
        // 受击硬直时不处理移动，让击退效果完整
        if (this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.keys.left.isDown) {
            body.setVelocityX(-PLAYER_CONFIG.speed);
            // this.facingDirection = -1; // Unused
            this.setFlipX(true);
        } else if (this.keys.right.isDown) {
            body.setVelocityX(PLAYER_CONFIG.speed);
            // this.facingDirection = 1; // Unused
            this.setFlipX(false);
        } else {
            body.setVelocityX(0);
        }
    }

    /**
     * 处理跳跃
     */
    private handleJump(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && body.onFloor()) {
            body.setVelocityY(-PLAYER_CONFIG.jumpForce);
            this.currentState = PlayerState.JUMP;
        }
    }

    /**
     * 处理攻击
     */
    private handleAttack(): void {
        if (
            Phaser.Input.Keyboard.JustDown(this.keys.attack) &&
            this.canAttack
        ) {
            console.log('[Player] J key pressed - Attack starting!');
            this.isAttacking = true;
            this.canAttack = false;
            this.hasHitThisAttack = false; // 重置命中标记
            this.canDealDamage = false; // 攻击开始时，不能造成伤害
            this.currentState = PlayerState.ATTACK;

            // 攻击时向前冲刺，增加命中几率
            // const body = this.body as Phaser.Physics.Arcade.Body;
            // const dashSpeed = 150; // 冲刺速度
            // const dashDirection = this.flipX ? -1 : 1; // 面向方向
            // body.setVelocityX(dashDirection * dashSpeed);

            // 连击逻辑
            const currentTime = this.scene.time.now;

            if (currentTime - this.lastAttackTime < this.COMBO_WINDOW) {
                this.comboCount++;
                if (this.comboCount >= PLAYER_ATTACK_TYPES.length) {
                    this.comboCount = 0; // 超过最大连击数，重置
                }
            } else {
                this.comboCount = 0; // 超时，重置为第一击
            }

            this.lastAttackTime = currentTime;
            console.log(`[Combos] Count: ${this.comboCount + 1}`);

            // 根据连击数选择攻击方式
            const attackType = PLAYER_ATTACK_TYPES[this.comboCount];
            const attackAnimKey = attackType.key;

            // 设置伤害倍率
            // 1: 1.0x, 2: 1.2x, 3: 1.5x
            const multipliers = [1.0, 1.2, 1.5];
            this.damageMultiplier = multipliers[this.comboCount] || 1.0;

            // 播放选择的攻击动画
            this.play(attackAnimKey, true);

            // 监听动画更新，在动画播放到一定进度时允许造成伤害
            const onAnimationUpdate = (
                animation: Phaser.Animations.Animation,
                frame: Phaser.Animations.AnimationFrame,
            ) => {
                if (animation.key === attackAnimKey) {
                    const progress = frame.index / attackType.frames;
                    // 当动画播放到 40% 时允许造成伤害 (稍微提前一点)
                    if (progress >= 0.4 && !this.canDealDamage) {
                        this.canDealDamage = true;
                    }
                }
            };

            this.on('animationupdate', onAnimationUpdate);

            // 监听动画完成事件，重置攻击状态
            this.once(
                'animationcomplete',
                (animation: Phaser.Animations.Animation) => {
                    if (animation.key === attackAnimKey) {
                        console.log(
                            '[Player] Attack animation complete - resetting state',
                        );
                        this.off('animationupdate', onAnimationUpdate);

                        // 短暂延迟后重置攻击状态
                        this.scene.time.delayedCall(50, () => {
                            console.log('[Player] Attack state reset');
                            this.isAttacking = false;
                            this.canDealDamage = false;
                            this.hasHitThisAttack = false;
                        });
                    }
                },
            );

            // 攻击冷却
            this.scene.time.delayedCall(PLAYER_CONFIG.attackCooldown, () => {
                this.canAttack = true;
            });
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
            console.log('[Player] J pressed but attack blocked:', {
                isAttacking: this.isAttacking,
                canAttack: this.canAttack,
            });
        }
    }

    /**
     * 更新动画状态
     */
    private updateAnimation(): void {
        if (this.isAttacking || this.currentState === PlayerState.HURT) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 10;
        const isOnFloor = body.onFloor();

        if (!isOnFloor) {
            // 空中状态
            if (this.currentState !== PlayerState.JUMP) {
                this.currentState = PlayerState.JUMP;
                this.play('player-jump', true);
            }
        } else if (isMoving) {
            // 移动状态
            if (this.currentState !== PlayerState.RUN) {
                this.currentState = PlayerState.RUN;
                this.play('player-run', true);
            }
        } else {
            // 待机状态
            if (this.currentState !== PlayerState.IDLE) {
                this.currentState = PlayerState.IDLE;
                this.play('player-idle', true);
            }
        }
    }

    /**
     * 踩头反弹
     */
    public bounce(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(-PLAYER_CONFIG.jumpForce * 0.8); // 弹跳力
        this.currentState = PlayerState.JUMP;
        this.play('player-jump', true);
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number, knockbackDir: number = 0): void {
        console.log('[Player] takeDamage called:', {
            damage,
            knockbackDir,
            isInvincible: this.isInvincible,
            currentHealth: this.health,
        });

        if (this.isInvincible) {
            console.log('[Player] Invincible, damage ignored');
            return;
        }

        this.health -= damage;
        console.log(
            '[Player] Health after damage:',
            this.health,
            '/',
            this.maxHealth,
        );

        // 发送血量变化事件
        this.scene.events.emit(
            'player-health-changed',
            this.health,
            this.maxHealth,
        );

        if (this.health <= 0) {
            this.die();
            return;
        }

        // 进入无敌状态（不改变currentState，让玩家继续操作）
        this.isInvincible = true;
        // ❌ 删除：this.currentState = PlayerState.HURT;

        // 击退效果
        if (knockbackDir !== 0) {
            const body = this.body as Phaser.Physics.Arcade.Body;

            // 设置击退
            body.setVelocityX(knockbackDir * PLAYER_CONFIG.knockbackForce);
            body.setVelocityY(-80); // 减少向上力度

            // 进入硬直状态，防止移动输入覆盖击退
            this.isStunned = true;
            this.scene.time.delayedCall(300, () => {
                this.isStunned = false;
            });
        }

        // 变红
        this.setTint(0xff0000);

        // 闪烁效果（增加持续时间，防止夹击卡死）
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.5, to: 1 },
            duration: 100,
            repeat: 9, // 闪烁10次，持续1秒
            onComplete: () => {
                this.isInvincible = false;
                this.clearTint();
                this.setAlpha(1); // 确保完全不透明
                // 不修改状态，让update逻辑继续处理
            },
        });
    }

    /**
     * 玩家死亡
     */
    private die(): void {
        this.health = 0;
        this.setTint(0xff0000);

        // 禁用物理
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        // 发送死亡事件
        this.scene.events.emit('player-died');
    }

    /**
     * 启用调试模式
     */
    public enableDebug(): void {
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(1000);
        }
        if (!this.debugText) {
            this.debugText = this.scene.add.text(0, 0, '', {
                fontSize: '12px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 },
            });
            this.debugText.setDepth(1001);
        }
    }

    /**
     * 禁用调试模式
     */
    public disableDebug(): void {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = undefined;
        }
        if (this.debugText) {
            this.debugText.destroy();
            this.debugText = undefined;
        }
    }

    /**
     * 更新调试信息
     */
    public updateDebug(): void {
        if (!this.debugGraphics || !this.debugText) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 清除之前的绘制
        this.debugGraphics.clear();

        // 1. 绘制碰撞框（绿色）
        this.debugGraphics.lineStyle(2, 0x00ff00);
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

        // 2. 绘制攻击范围（红色圆圈）
        if (this.isAttacking) {
            this.debugGraphics.lineStyle(2, 0xff0000);
            const attackX =
                this.x +
                (this.flipX
                    ? -PLAYER_CONFIG.attackRange
                    : PLAYER_CONFIG.attackRange);
            this.debugGraphics.strokeCircle(
                attackX,
                this.y,
                PLAYER_CONFIG.attackRange,
            );
        }

        // 3. 更新文本信息
        const debugInfo = [
            `状态: ${this.currentState}`,
            `血量: ${this.health}/${this.maxHealth}`,
            `坐标: (${Math.round(this.x)}, ${Math.round(this.y)})`,
            `速度: (${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)})`,
            `攻击中: ${this.isAttacking}`,
            `可造成伤害: ${this.canDealDamage}`,
        ];

        this.debugText.setText(debugInfo.join('\n'));
        this.debugText.setPosition(this.x - 50, this.y - 100);
        this.debugText.setVisible(true);
    }

    /**
     * 处理冲刺
     */
    private handleDash(): void {
        if (!this.canDash || this.isDashing) return;

        // 确定冲刺方向（优先使用当前面向，如果正在移动则使用移动方向）
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (this.keys.left.isDown) {
            this.dashDirection = -1;
        } else if (this.keys.right.isDown) {
            this.dashDirection = 1;
        } else {
            // 使用当前面向
            this.dashDirection = this.flipX ? -1 : 1;
        }

        // 开始冲刺
        this.isDashing = true;
        this.canDash = false;
        this.isInvincible = true; // 冲刺期间无敌

        // 中断攻击状态 (修复冲刺导致重复伤害的 Bug)
        if (this.isAttacking) {
            console.log('[Dash] Interrupting attack');
            this.isAttacking = false;
            this.canDealDamage = false;
            this.hasHitThisAttack = false;
            // 可以选择停止当前动画或保持当前帧
        }

        // 禁用与敌人的碰撞（穿越敌人）
        const gameScene = this.scene as GameScene;
        if (gameScene.playerEnemyCollider) {
            gameScene.playerEnemyCollider.active = false;
        }

        // 设置冲刺速度
        body.setVelocityX(PLAYER_CONFIG.dashSpeed * this.dashDirection);

        console.log('[Dash] 开始冲刺，方向:', this.dashDirection);

        // 视觉效果：设置半透明
        this.setAlpha(0.6);

        // 冲刺持续时间后结束
        this.scene.time.delayedCall(PLAYER_CONFIG.dashDuration, () => {
            this.isDashing = false;
            this.isInvincible = false;
            this.setAlpha(1.0);

            // 恢复与敌人的碰撞
            if (gameScene.playerEnemyCollider) {
                gameScene.playerEnemyCollider.active = true;
            }

            console.log('[Dash] 冲刺结束');
        });

        // 冷却时间
        this.scene.time.delayedCall(PLAYER_CONFIG.dashCooldown, () => {
            this.canDash = true;
            console.log('[Dash] 冷却完成');
        });
    }
}
