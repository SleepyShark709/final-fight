/**
 * 岩浆骑士 — 熔岩区精英敌人
 * 基于 ShieldEnemy 模式：正面格挡 + 三段连击
 * 外观：骷髅动画 + 深红 tint + 大体型
 * 连击结束后盾牌放下一段时间，期间易受攻击
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';

export class MagmaKnightEnemy extends Enemy {
    /** 盾牌状态：true = 正面格挡 */
    public isShielding: boolean = true;

    private shieldDownTimer?: Phaser.Time.TimerEvent;
    private readonly shieldDownDuration: number;

    /** 连击系统 */
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
     * 重写受伤：正面格挡减 70% 伤害
     */
    public takeDamage(damage: number, knockbackDirection: number = 0): void {
        if (this.isDead) return;

        if (this.isShielding && knockbackDirection !== 0) {
            // 判断是否为正面攻击
            // flipX=true → 朝左，正面在左 → knockbackDir=1（玩家在左，推向右）= 正面攻击
            // flipX=false → 朝右，正面在右 → knockbackDir=-1（玩家在右，推向左）= 正面攻击
            const isFrontAttack =
                (this.flipX && knockbackDirection > 0) ||
                (!this.flipX && knockbackDirection < 0);

            if (isFrontAttack) {
                // 格挡：只有 30% 穿透伤害
                damage = Math.round(damage * 0.3);

                // 格挡闪光视觉反馈
                this.setTint(0xffffff);
                this.scene.time.delayedCall(100, () => {
                    if (!this.isDead) this.setTint(0xaa2200);
                });

                // 格挡时轻微后退
                const body = this.body as Phaser.Physics.Arcade.Body;
                body.setVelocityX(knockbackDirection * 30);

                // 扣减穿透血量
                this.health -= damage;
                this.updateHealthBar();
                if (this.health <= 0) {
                    this.die();
                }
                return;
            }
        }

        // 非正面攻击或盾牌放下：正常受击
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

    /**
     * 重写 AI：追击 + 三段连击
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (distanceToPlayer > this.config.detectRange) {
            this.currentState = EnemyState.PATROL;
            this.patrol();
            return;
        }

        // 面朝玩家
        this.setFlipX(player.x < this.x);
        this.currentState = EnemyState.CHASE;
        // 进入追击时重置连击计数，防止下次攻击从中间步开始
        if (this.comboStep > 0 && !this.isAttacking) {
            this.comboStep = 0;
        }

        if (distanceToPlayer <= this.config.attackRange && this.canAttack) {
            // 发起连击
            this.performComboAttack(player);
        } else {
            // 向玩家移动
            body.setVelocityX(
                (player.x > this.x ? 1 : -1) * this.config.speed,
            );
        }
    }

    /**
     * 三段连击系统
     * 连击期间盾牌放下，连击结束后盾牌在 shieldDownDuration 后恢复
     */
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
                // 连击中间短暂间隔后继续
                this.scene.time.delayedCall(300, () => {
                    if (!this.isDead) {
                        this.canAttack = true;
                    }
                });
            } else {
                // 连击结束，重置连击计数
                this.comboStep = 0;

                // 盾牌放下一段时间后恢复
                this.shieldDownTimer = this.scene.time.delayedCall(this.shieldDownDuration, () => {
                    if (!this.isDead) {
                        this.isShielding = true;
                    }
                });

                // 攻击冷却
                this.scene.time.delayedCall(this.config.attackCooldown, () => {
                    if (!this.isDead) {
                        this.canAttack = true;
                    }
                });
            }
        });
    }

    /**
     * 死亡时清理计时器
     */
    protected die(): void {
        if (this.shieldDownTimer) {
            this.shieldDownTimer.destroy();
            this.shieldDownTimer = undefined;
        }
        super.die();
    }
}
