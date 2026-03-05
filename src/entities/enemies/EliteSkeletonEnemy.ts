/**
 * 精英骷髅剑士
 * 高血量、快速3段连击、有概率闪避攻击
 * 行为：追击 → 连击 → 后撤闪避 → 重新接近
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';

/** 精英骷髅连击阶段 */
enum EliteComboPhase {
    IDLE,
    COMBO_1,
    COMBO_2,
    COMBO_3,
    COOLDOWN,
}

export class EliteSkeletonEnemy extends Enemy {
    // 连击系统
    private comboPhase: EliteComboPhase = EliteComboPhase.IDLE;
    private readonly comboSteps: number;
    private comboDelayTimer?: Phaser.Time.TimerEvent;

    // 闪避系统
    private readonly dodgeChance: number;
    private readonly dodgeCooldown: number;
    private canDodge: boolean = true;
    private isDodging: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.elite_skeleton;
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

        this.comboSteps = (entry.extra?.comboSteps as number) || 3;
        this.dodgeChance = (entry.extra?.dodgeChance as number) || 0.25;
        this.dodgeCooldown = (entry.extra?.dodgeCooldown as number) || 3000;

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 红色色调 — 精英标记
        this.setTint(0xff4444);

        this.play('skeleton-idle');
    }

    /**
     * 重写攻击 — 3段连击
     */
    protected attack(_player: Player): void {
        if (!this.canAttack || this.comboPhase !== EliteComboPhase.IDLE) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        this.canAttack = false;
        this.comboPhase = EliteComboPhase.COMBO_1;
        this.currentState = EnemyState.ATTACK;

        this.executeComboHit(1);
    }

    /**
     * 执行连击的某一段
     */
    private executeComboHit(step: number): void {
        // 预备期间变黄色
        this.isPreparing = true;
        this.setTint(0xffff00);

        // 预备时间随连击段数递减（越快越紧凑）
        const prepTime = step === 1 ? 300 : 150;

        this.scene.time.delayedCall(prepTime, () => {
            if (this.isDead) return;

            this.clearTint();
            this.setTint(0xff4444); // 恢复精英色调
            this.isPreparing = false;
            this.isAttacking = true;

            this.playAttackAnimation();

            this.once('animationcomplete', () => {
                this.isAttacking = false;

                if (step < this.comboSteps && !this.isDead) {
                    // 继续下一段连击
                    this.comboPhase = step === 1
                        ? EliteComboPhase.COMBO_2
                        : EliteComboPhase.COMBO_3;

                    // 短暂延迟后执行下一段
                    this.comboDelayTimer = this.scene.time.delayedCall(120, () => {
                        this.executeComboHit(step + 1);
                    });
                } else {
                    // 连击结束，进入冷却
                    this.comboPhase = EliteComboPhase.COOLDOWN;
                    this.currentState = EnemyState.IDLE;

                    // 连击结束后尝试后撤
                    this.tryBackstep();

                    // 攻击冷却
                    this.scene.time.delayedCall(this.config.attackCooldown, () => {
                        this.canAttack = true;
                        this.comboPhase = EliteComboPhase.IDLE;
                    });
                }
            });
        });
    }

    /**
     * 连击后后撤
     */
    private tryBackstep(): void {
        if (this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const backstepDir = this.flipX ? 1 : -1; // 面向的反方向
        body.setVelocityX(backstepDir * this.config.speed * 1.5);

        this.scene.time.delayedCall(250, () => {
            if (!this.isDead) {
                body.setVelocityX(0);
            }
        });
    }

    /**
     * 重写受伤 — 有概率闪避
     */
    public takeDamage(damage: number, knockbackDir: number = 0): void {
        // 闪避判定
        if (this.canDodge && Math.random() < this.dodgeChance && !this.isStunned) {
            this.performDodge(knockbackDir);
            return;
        }

        super.takeDamage(damage, knockbackDir);

        // 受击中断连击
        if (this.comboPhase !== EliteComboPhase.IDLE) {
            this.comboPhase = EliteComboPhase.IDLE;
            if (this.comboDelayTimer) {
                this.comboDelayTimer.destroy();
                this.comboDelayTimer = undefined;
            }
        }
    }

    /**
     * 执行闪避
     */
    private performDodge(knockbackDir: number): void {
        this.canDodge = false;
        this.isDodging = true;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 闪避方向：远离攻击来源
        const dodgeDir = knockbackDir !== 0 ? knockbackDir : (this.flipX ? 1 : -1);
        body.setVelocityX(dodgeDir * this.config.speed * 2.5);
        body.setVelocityY(-100);

        // 闪避视觉：半透明 + 白色
        this.setAlpha(0.4);
        this.setTint(0xffffff);

        this.scene.time.delayedCall(200, () => {
            if (this.isDead) return;
            this.isDodging = false;
            this.setAlpha(1);
            this.setTint(0xff4444);
            body.setVelocityX(0);
        });

        // 闪避冷却
        this.scene.time.delayedCall(this.dodgeCooldown, () => {
            this.canDodge = true;
        });
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead || this.isDodging) return;

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
}
