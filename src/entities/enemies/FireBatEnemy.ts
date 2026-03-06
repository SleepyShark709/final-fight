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

/** 飞行子状态 */
enum FlyState {
    FLOAT = 'float',   // 空中漂浮巡逻
    SWOOP = 'swoop',   // 俯冲攻击
    RETURN = 'return', // 返回高空
}

export class FireBatEnemy extends Enemy {
    private flyState: FlyState = FlyState.FLOAT;
    private floatY: number;           // 悬浮目标Y坐标
    private swoopTargetY: number = 0; // 俯冲目标Y
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

        // 禁用重力（自行管理垂直运动）
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

    /**
     * 重写 AI：飞行模式 — 漂浮 → 俯冲 → 返回
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        switch (this.flyState) {
            case FlyState.FLOAT:
                this.maintainFloatHeight(body);

                if (distanceToPlayer <= this.config.detectRange) {
                    // 检测到玩家：追踪并朝向玩家
                    this.setFlipX(player.x < this.x);
                    this.currentState = EnemyState.CHASE;
                    const dir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(dir * this.config.speed);

                    if (distanceToPlayer <= this.config.attackRange * 3 && this.canAttack) {
                        // 开始俯冲
                        this.startSwoop(player);
                    }
                } else {
                    this.currentState = EnemyState.PATROL;
                    this.patrolFloat(body);
                    this.maintainFloatHeight(body);
                }
                break;

            case FlyState.SWOOP:
                // 俯冲中：向下冲
                body.setVelocityY(this.swoopSpeed);
                {
                    const hDir = player.x > this.x ? 1 : -1;
                    body.setVelocityX(hDir * this.config.speed * 1.5);
                    this.setFlipX(player.x < this.x);

                    // 到达攻击位置时触发攻击
                    if (Math.abs(this.y - player.y) < 40) {
                        this.flyState = FlyState.RETURN;
                        this.attack(player);
                    }

                    // 防止俯冲过低
                    if (this.y > this.swoopTargetY + 80) {
                        this.flyState = FlyState.RETURN;
                    }
                }
                break;

            case FlyState.RETURN:
                // 返回高空
                this.maintainFloatHeight(body, true);
                if (Math.abs(this.y - this.floatY) < 20) {
                    this.flyState = FlyState.FLOAT;
                    body.setVelocityY(0);
                }
                break;
        }
    }

    /**
     * 维持悬浮高度（弹簧效果）
     */
    private maintainFloatHeight(body: Phaser.Physics.Arcade.Body, fast = false): void {
        const yDiff = this.floatY - this.y;
        const speed = fast ? 8 : 4;
        body.setVelocityY(
            Phaser.Math.Clamp(yDiff * speed, -this.swoopSpeed, this.swoopSpeed),
        );
    }

    /**
     * 开始俯冲
     */
    private startSwoop(player: Player): void {
        this.flyState = FlyState.SWOOP;
        this.swoopTargetY = player.y;
        this.canAttack = false;

        // 俯冲冷却
        this.scene.time.delayedCall(this.config.attackCooldown, () => {
            this.canAttack = true;
        });
    }

    /**
     * 空中水平来回巡逻
     */
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
