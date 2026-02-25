/**
 * 敌人基类
 * 提供敌人通用行为和属性
 */
import Phaser from 'phaser';
import { Player } from './Player';
import { EffectsManager } from '../utils/EffectsManager';

// 敌人状态枚举
export enum EnemyState {
    IDLE = 'idle',
    PATROL = 'patrol',
    CHASE = 'chase',
    ATTACK = 'attack',
    HURT = 'hurt',
    DEAD = 'dead',
}

export interface EnemyConfig {
    maxHealth: number;
    speed: number;
    attackDamage: number;
    attackRange: number;
    attackCooldown: number;
    detectRange: number;
    patrolRange: number;
    mass: number; // 质量系数
    knockbackForce: number; // 基础击退力度
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
    // 配置
    protected config: EnemyConfig;

    // 生命值
    public health: number;
    public maxHealth: number;

    // 攻击属性
    public attackDamage: number;
    public isAttacking: boolean = false;

    // 状态
    public isDead: boolean = false;
    protected currentState: EnemyState = EnemyState.IDLE;

    // 巡逻
    protected patrolStartX: number;
    protected patrolDirection: number = 1;
    protected idleTimer: number = 0; // idle 状态的计时器
    protected nextIdleTime: number = 0; // 下次进入 idle 的时间

    // 攻击冷却
    protected canAttack: boolean = true;

    // 受击硬直状态
    protected isStunned: boolean = false;

    // 预备攻击状态（防止动画被覆盖）
    protected isPreparing: boolean = false;

    // 血条UI（使用 Rectangle 代替 Graphics，避免每帧 clear+fillRect 的开销）
    protected healthBarBg!: Phaser.GameObjects.Rectangle;
    protected healthBarFill!: Phaser.GameObjects.Rectangle;

    // 调试模式
    protected debugGraphics?: Phaser.GameObjects.Graphics;
    protected debugText?: Phaser.GameObjects.Text;
    protected debugDistanceToPlayer: number = 0; // 调试用：到玩家的距离

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        config: EnemyConfig,
    ) {
        super(scene, x, y, texture);

        this.config = config;
        this.health = config.maxHealth;
        this.maxHealth = config.maxHealth;
        this.attackDamage = config.attackDamage;
        this.patrolStartX = x;

        // 添加到场景
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 设置物理属性
        this.setCollideWorldBounds(true);
        this.setBounce(0);

        // 设置不可推动（防止被玩家推着走）
        (this.body as Phaser.Physics.Arcade.Body).pushable = false;

        // 创建血条
        this.createHealthBar();
    }

    /**
     * 每帧更新（需要传入玩家引用）
     */
    public update(time: number, _delta: number, player: Player): void {
        if (this.isDead) return;

        // 计算与玩家的距离
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            player.x,
            player.y,
        );
        this.debugDistanceToPlayer = distanceToPlayer; // 保存用于调试显示

        // 更新 idle 计时器
        if (this.currentState === EnemyState.IDLE) {
            if (time >= this.idleTimer) {
                // idle 时间结束，恢复巡逻
                this.currentState = EnemyState.PATROL;
            }
        }

        // AI 状态机
        this.updateAI(distanceToPlayer, player);

        // 更新动画
        this.updateAnimation();

        // 更新血条位置
        this.updateHealthBarPosition();
    }

    /**
     * AI 行为更新
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        // 如果正在攻击、预备攻击或受击硬直，不处理其他行为
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        // 如果正在 idle，不处理其他行为
        if (this.currentState === EnemyState.IDLE) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocityX(0);
            return;
        }

        // 计算水平距离（避免玩家在正上方时频繁转头）
        const horizontalDistance = Math.abs(player.x - this.x);
        const minHorizontalDistance = 10; // 最小水平距离阈值

        // 计算垂直距离（判断是否在同一平台层级）
        const verticalDistance = Math.abs(this.y - player.y);
        const isSamePlatform = verticalDistance < 50; // 允许一定的高度差容差

        // 检测玩家
        if (distanceToPlayer <= this.config.attackRange && isSamePlatform) {
            // 在攻击范围内 - 攻击
            // 只有在水平距离足够时才改变面向
            if (horizontalDistance > minHorizontalDistance) {
                if (player.x < this.x) {
                    this.setFlipX(true);
                } else {
                    this.setFlipX(false);
                }
            }
            this.attack(player);
        } else if (
            distanceToPlayer <= this.config.detectRange &&
            isSamePlatform
        ) {
            // 在检测范围内且在同一高度 - 追击
            this.currentState = EnemyState.CHASE;
            this.chasePlayer(player, horizontalDistance, minHorizontalDistance);
        } else {
            // 巡逻或 idle
            this.currentState = EnemyState.PATROL;
            this.patrol();
        }
    }

    /**
     * 巡逻行为
     */
    protected patrol(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const currentTime = this.scene.time.now;

        // 随机进入 idle 状态
        if (currentTime >= this.nextIdleTime) {
            // 进入 idle 状态
            this.currentState = EnemyState.IDLE;
            body.setVelocityX(0);

            // 设置 idle 持续时间（1-3秒）
            const idleDuration = Phaser.Math.Between(1000, 3000);
            this.idleTimer = currentTime + idleDuration;

            // 设置下次 idle 时间（5-10秒后）
            this.nextIdleTime =
                currentTime + idleDuration + Phaser.Math.Between(5000, 10000);
            return;
        }

        // 到达巡逻边界时转向
        if (this.x > this.patrolStartX + this.config.patrolRange) {
            this.patrolDirection = -1;
        } else if (this.x < this.patrolStartX - this.config.patrolRange) {
            this.patrolDirection = 1;
        }

        body.setVelocityX(this.config.speed * 0.5 * this.patrolDirection);

        // 同步朝向和移动方向
        this.setFlipX(this.patrolDirection < 0);
    }

    /**
     * 追击玩家
     */
    protected chasePlayer(
        player: Player,
        horizontalDistance: number,
        minHorizontalDistance: number,
    ): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        // 如果水平距离太近（玩家在正上方/正下方），则停止移动
        if (horizontalDistance < minHorizontalDistance) {
            body.setVelocityX(0);
            return;
        }

        // 改变面向并移动
        if (player.x < this.x) {
            this.setFlipX(true);
            body.setVelocityX(-this.config.speed);
        } else {
            this.setFlipX(false);
            body.setVelocityX(this.config.speed);
        }
    }

    /**
     * 攻击
     */
    protected attack(_player: Player): void {
        if (!this.canAttack) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // 进入预备状态
        this.isPreparing = true;
        this.canAttack = false;
        this.currentState = EnemyState.ATTACK;

        // 预备期间变黄色提示玩家
        this.setTint(0xffff00);

        // 300ms预备后开始攻击
        this.scene.time.delayedCall(300, () => {
            this.clearTint();
            this.isPreparing = false;
            this.isAttacking = true;

            // 播放攻击动画
            this.playAttackAnimation();

            // 动画完成后恢复
            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE; // 重置状态，允许继续移动
            });
        });

        // 攻击冷却
        this.scene.time.delayedCall(this.config.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    /**
     * 播放攻击动画（子类实现）
     */
    protected abstract playAttackAnimation(): void;

    /**
     * 更新动画（子类实现）
     */
    protected abstract updateAnimation(): void;

    private static readonly BAR_WIDTH = 40;
    private static readonly BAR_HEIGHT = 4;
    private static readonly BAR_OFFSET_Y = -40;

    /**
     * 创建血条（使用 Rectangle，只需 setPosition/setSize，无需每帧重绘）
     */
    private createHealthBar(): void {
        const { BAR_WIDTH, BAR_HEIGHT, BAR_OFFSET_Y } = Enemy;

        this.healthBarBg = this.scene.add.rectangle(
            this.x - BAR_WIDTH / 2,
            this.y + BAR_OFFSET_Y,
            BAR_WIDTH,
            BAR_HEIGHT,
            0x000000,
            0.8,
        );
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setDepth(1000);

        this.healthBarFill = this.scene.add.rectangle(
            this.x - BAR_WIDTH / 2,
            this.y + BAR_OFFSET_Y,
            BAR_WIDTH,
            BAR_HEIGHT,
            0x00ff00,
        );
        this.healthBarFill.setOrigin(0, 0);
        this.healthBarFill.setDepth(1001);
    }

    /**
     * 更新血条颜色（受伤时调用）
     */
    protected updateHealthBar(): void {
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const fillWidth = Math.max(1, Enemy.BAR_WIDTH * healthPercent);

        let color = 0x00ff00;
        if (healthPercent < 0.3) color = 0xff0000;
        else if (healthPercent < 0.6) color = 0xffff00;

        this.healthBarFill.setSize(fillWidth, Enemy.BAR_HEIGHT);
        this.healthBarFill.setFillStyle(color);
    }

    /**
     * 每帧更新血条位置（只需 setPosition，无重绘开销）
     */
    private updateHealthBarPosition(): void {
        const x = this.x - Enemy.BAR_WIDTH / 2;
        const y = this.y + Enemy.BAR_OFFSET_Y;
        this.healthBarBg.setPosition(x, y);
        this.healthBarFill.setPosition(x, y);
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number, knockbackDir: number = 0): void {
        if (this.isDead) return;

        this.health -= damage;

        // 调试日志
        console.log(
            `[Enemy] Take ${damage} damage, health: ${this.health}/${this.maxHealth}`,
        );

        // 更新血条
        this.updateHealthBar();

        // 受击效果 - 变红
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            this.clearTint();
        });

        // 进入硬直状态，防止AI覆盖击退速度
        this.isStunned = true;
        this.scene.time.delayedCall(300, () => {
            this.isStunned = false;
        });

        // 击退 - 应用质量系统
        const body = this.body as Phaser.Physics.Arcade.Body;

        // 计算实际击退力度（基础力度 / 质量）
        const actualKnockbackForce =
            this.config.knockbackForce / this.config.mass;

        if (knockbackDir !== 0) {
            body.setVelocityX(knockbackDir * actualKnockbackForce);
            body.setVelocityY(-80); // 垂直击退保持不变
        } else {
            // 默认根据面向方向击退
            const defaultDir = this.flipX ? 1 : -1;
            body.setVelocityX(defaultDir * actualKnockbackForce);
            body.setVelocityY(-80);
        }

        // Squash/Stretch 击退形变：横向拉伸 + 纵向压缩
        const sx = this.scaleX;
        const sy = this.scaleY;
        this.setScale(sx * 1.35, sy * 0.7);
        this.scene.tweens.add({
            targets: this,
            scaleX: sx,
            scaleY: sy,
            duration: 180,
            ease: 'Power2',
        });

        if (this.health <= 0) {
            console.log('[Enemy] Dying...');
            this.die();
        }
    }

    /**
     * 死亡
     */
    protected die(): void {
        this.isDead = true;
        this.currentState = EnemyState.DEAD;

        // 禁用物理
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        // 清理调试图形和文本
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = undefined;
        }
        if (this.debugText) {
            this.debugText.destroy();
            this.debugText = undefined;
        }

        // 死亡粒子爆散
        EffectsManager.createDeathParticles(this.scene, this.x, this.y - 20);

        // 渐隐消失
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 400,
            onComplete: () => {
                this.destroy();
            },
        });
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
                color: '#ff6600',
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

        // 1. 绘制碰撞框（橙色）
        this.debugGraphics.lineStyle(2, 0xff6600);
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);

        // 2. 绘制攻击范围（红色圆圈）
        this.debugGraphics.lineStyle(2, 0xff0000, 0.5);
        this.debugGraphics.strokeCircle(
            this.x,
            this.y,
            this.config.attackRange,
        );

        // 3. 绘制检测范围（黄色圆圈）
        this.debugGraphics.lineStyle(1, 0xffff00, 0.3);
        this.debugGraphics.strokeCircle(
            this.x,
            this.y,
            this.config.detectRange,
        );

        // 4. 更新文本信息
        const debugInfo = [
            `状态: ${this.currentState}`,
            `血量: ${this.health}/${this.maxHealth}`,
            `坐标: (${Math.round(this.x)}, ${Math.round(this.y)})`,
            `速度: (${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)})`,
            `距离玩家: ${Math.round(this.debugDistanceToPlayer)}`,
            `攻击范围: ${this.config.attackRange}`,
            `攻击中: ${this.isAttacking}`,
        ];

        this.debugText.setText(debugInfo.join('\n'));
        this.debugText.setPosition(this.x - 50, this.y - 140);
        this.debugText.setVisible(true);
    }
}
