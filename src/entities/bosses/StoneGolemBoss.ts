/**
 * 岩石巨像 — 石窟区域 Boss
 *
 * 3阶段 Boss：
 * Phase 1 (100%~60%): 缓慢近战 + 地震波
 * Phase 2 (60%~30%):  加速 + 投掷岩石 + 地震波增强
 * Phase 3 (30%~0%):   狂暴 + 冲撞 + 连续地震
 *
 * 攻击预兆：
 *   - 近战：手臂抬起（黄色闪烁 500ms）
 *   - 地震波：跳起并落下（屏幕震动）
 *   - 投掷岩石：蓄力后发射抛物线石头
 *   - 冲撞：后退蓄力 → 高速冲刺
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';
import { EffectsManager } from '@/utils/EffectsManager';

/** Boss 阶段 */
enum BossPhase {
    PHASE_1,
    PHASE_2,
    PHASE_3,
}

/** Boss 攻击类型 */
enum BossAttackType {
    MELEE,      // 近战锤击
    QUAKE,      // 地震波
    ROCK_THROW, // 投掷岩石
    CHARGE,     // 冲撞
}

export class StoneGolemBoss extends Enemy {
    // Boss 阶段
    private bossPhase: BossPhase = BossPhase.PHASE_1;

    // Boss 特殊属性
    private readonly phase2Threshold: number;
    private readonly phase3Threshold: number;
    private readonly quakeDamage: number;
    private readonly quakeRange: number;
    private readonly rockSpeed: number;
    private readonly chargeSpeed: number;

    // 攻击模式
    private currentAttackType: BossAttackType = BossAttackType.MELEE;
    private attackPattern: BossAttackType[] = [];
    private attackPatternIndex: number = 0;

    // 冲撞状态
    private isCharging: boolean = false;
    private chargeDirection: number = 0;

    // 投射物
    public rocks: Phaser.Physics.Arcade.Sprite[] = [];

    // 阶段转换中
    private isTransitioning: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.stone_golem;
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

        // 读取 Boss 特殊属性
        const extra = entry.extra || {};
        this.phase2Threshold = (extra.phase2Threshold as number) || 0.6;
        this.phase3Threshold = (extra.phase3Threshold as number) || 0.3;
        this.quakeDamage = (extra.quakeDamage as number) || 15;
        this.quakeRange = (extra.quakeRange as number) || 200;
        this.rockSpeed = (extra.rockSpeed as number) || 300;
        this.chargeSpeed = (extra.chargeSpeed as number) || 300;

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // Boss 色调：深灰石质感
        this.setTint(0x888888);

        // 初始化攻击模式
        this.buildAttackPattern();

        this.play('skeleton-idle');
    }

    /**
     * 构建攻击模式序列
     */
    private buildAttackPattern(): void {
        switch (this.bossPhase) {
            case BossPhase.PHASE_1:
                this.attackPattern = [
                    BossAttackType.MELEE,
                    BossAttackType.MELEE,
                    BossAttackType.QUAKE,
                ];
                break;
            case BossPhase.PHASE_2:
                this.attackPattern = [
                    BossAttackType.MELEE,
                    BossAttackType.QUAKE,
                    BossAttackType.ROCK_THROW,
                    BossAttackType.MELEE,
                ];
                break;
            case BossPhase.PHASE_3:
                this.attackPattern = [
                    BossAttackType.CHARGE,
                    BossAttackType.QUAKE,
                    BossAttackType.MELEE,
                    BossAttackType.ROCK_THROW,
                    BossAttackType.QUAKE,
                ];
                break;
        }
        this.attackPatternIndex = 0;
    }

    /**
     * 重写 AI — Boss 独立行为
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned || this.isTransitioning) return;

        // 阶段检测
        this.checkPhaseTransition();

        // 冲撞中持续移动
        if (this.isCharging) {
            this.updateCharge(player);
            return;
        }

        // 在攻击范围内
        if (distanceToPlayer <= this.getEffectiveRange()) {
            this.performNextAttack(player);
        } else if (distanceToPlayer <= this.config.detectRange) {
            // 追击
            this.currentState = EnemyState.CHASE;
            const body = this.body as Phaser.Physics.Arcade.Body;
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
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocityX(0);
        }
    }

    /**
     * 根据阶段获取移动速度
     */
    private getPhaseSpeed(): number {
        switch (this.bossPhase) {
            case BossPhase.PHASE_1: return this.config.speed;
            case BossPhase.PHASE_2: return this.config.speed * 1.4;
            case BossPhase.PHASE_3: return this.config.speed * 1.8;
        }
    }

    /**
     * 获取当前阶段有效攻击范围
     */
    private getEffectiveRange(): number {
        const nextAttack = this.attackPattern[this.attackPatternIndex];
        switch (nextAttack) {
            case BossAttackType.MELEE: return this.config.attackRange;
            case BossAttackType.QUAKE: return this.quakeRange * 0.8;
            case BossAttackType.ROCK_THROW: return 250;
            case BossAttackType.CHARGE: return 200;
            default: return this.config.attackRange;
        }
    }

    /**
     * 检查阶段转换
     */
    private checkPhaseTransition(): void {
        const healthPercent = this.health / this.maxHealth;

        if (this.bossPhase === BossPhase.PHASE_1 && healthPercent <= this.phase2Threshold) {
            this.transitionToPhase(BossPhase.PHASE_2);
        } else if (this.bossPhase === BossPhase.PHASE_2 && healthPercent <= this.phase3Threshold) {
            this.transitionToPhase(BossPhase.PHASE_3);
        }
    }

    /**
     * 阶段转换
     */
    private transitionToPhase(phase: BossPhase): void {
        this.isTransitioning = true;
        this.bossPhase = phase;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // 转换视觉：震动 + 变色
        const phaseColors: Record<BossPhase, number> = {
            [BossPhase.PHASE_1]: 0x888888,
            [BossPhase.PHASE_2]: 0xcc6600,  // 橙色 — 愤怒
            [BossPhase.PHASE_3]: 0xff2200,  // 红色 — 狂暴
        };

        // 阶段转换动画
        this.setTint(0xffffff);
        this.scene.cameras.main.shake(500, 0.01);

        this.scene.tweens.add({
            targets: this,
            scaleX: this.scaleX * 1.1,
            scaleY: this.scaleY * 1.1,
            duration: 300,
            yoyo: true,
            onComplete: () => {
                this.setTint(phaseColors[phase]);
                this.isTransitioning = false;
                this.buildAttackPattern();

                // 发出阶段转换事件
                this.scene.events.emit('boss-phase-change', {
                    phase: phase,
                    bossName: ENEMY_TABLE.stone_golem.name,
                });
            },
        });
    }

    /**
     * 执行下一个攻击
     */
    private performNextAttack(player: Player): void {
        if (!this.canAttack) return;

        this.currentAttackType = this.attackPattern[this.attackPatternIndex];
        this.attackPatternIndex = (this.attackPatternIndex + 1) % this.attackPattern.length;

        // 面向玩家
        this.setFlipX(player.x < this.x);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        switch (this.currentAttackType) {
            case BossAttackType.MELEE:
                this.performMelee(player);
                break;
            case BossAttackType.QUAKE:
                this.performQuake(player);
                break;
            case BossAttackType.ROCK_THROW:
                this.performRockThrow(player);
                break;
            case BossAttackType.CHARGE:
                this.performCharge(player);
                break;
        }
    }

    // ===== 攻击实现 =====

    /**
     * 近战锤击 — 类似普通攻击但预兆更长
     */
    private performMelee(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：黄色闪烁
        this.setTint(0xffff00);

        this.scene.time.delayedCall(500, () => {
            if (this.isDead) return;

            this.clearTint();
            this.setTint(this.getPhaseColor());
            this.isPreparing = false;
            this.isAttacking = true;
            this.hitPlayerThisAttack = false;

            this.playAttackAnimation();

            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;
            });

            this.scene.time.delayedCall(this.config.attackCooldown, () => {
                this.canAttack = true;
            });
        });
    }

    /**
     * 地震波 — 跳起落下，范围伤害
     */
    private performQuake(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：身体上升
        this.setTint(0xff8800);
        const body = this.body as Phaser.Physics.Arcade.Body;

        this.scene.time.delayedCall(600, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            body.setVelocityY(-300);

            // 落下后触发地震
            this.scene.time.delayedCall(500, () => {
                if (this.isDead) return;

                // 震动效果
                this.scene.cameras.main.shake(300, 0.02);
                this.setTint(this.getPhaseColor());

                // 地震波视觉
                const quakeCircle = this.scene.add.circle(
                    this.x, this.y + 30,
                    this.quakeRange,
                    0xffaa00, 0.3,
                );
                quakeCircle.setDepth(DEPTH.EFFECTS);
                this.scene.tweens.add({
                    targets: quakeCircle,
                    alpha: 0,
                    scaleX: 1.5,
                    scaleY: 0.3,
                    duration: 400,
                    onComplete: () => quakeCircle.destroy(),
                });

                // 地震伤害事件
                this.scene.events.emit('boss-quake', {
                    x: this.x,
                    y: this.y,
                    damage: this.quakeDamage,
                    range: this.quakeRange,
                });

                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;

                this.scene.time.delayedCall(this.config.attackCooldown * 0.8, () => {
                    this.canAttack = true;
                });
            });
        });
    }

    /**
     * 投掷岩石 — 创建抛物线投射物
     */
    private performRockThrow(player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        this.setTint(0xaa6600);

        this.scene.time.delayedCall(700, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            this.setTint(this.getPhaseColor());

            this.playAttackAnimation();

            // 创建岩石投射物
            const rock = this.scene.physics.add.sprite(
                this.x,
                this.y - 20,
                `${ASSETS.TILESET_GRASS}-1`,
            );
            rock.setScale(0.6);
            rock.setTint(0x665544);
            rock.setDepth(DEPTH.EFFECTS);

            const rockBody = rock.body as Phaser.Physics.Arcade.Body;
            const dirX = player.x - this.x;
            const dirY = player.y - this.y - 60; // 略微瞄高
            const angle = Math.atan2(dirY, dirX);
            rockBody.setVelocityX(Math.cos(angle) * this.rockSpeed);
            rockBody.setVelocityY(Math.sin(angle) * this.rockSpeed - 100); // 抛物线
            rockBody.setGravityY(400);

            this.rocks.push(rock);

            // 岩石超时销毁
            this.scene.time.delayedCall(3000, () => {
                this.destroyRock(rock);
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

    /**
     * 冲撞 — 后退蓄力后高速冲刺
     */
    private performCharge(player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 后退蓄力
        this.chargeDirection = player.x < this.x ? -1 : 1;
        body.setVelocityX(-this.chargeDirection * 100); // 后退

        this.setTint(0xff0000);

        this.scene.time.delayedCall(800, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            this.isCharging = true;
            this.isAttacking = true;
            this.hitPlayerThisAttack = false;

            // 高速冲刺
            body.setVelocityX(this.chargeDirection * this.chargeSpeed);

            // 冲撞持续时间
            this.scene.time.delayedCall(1000, () => {
                this.stopCharge();
            });
        });
    }

    /**
     * 更新冲撞状态
     */
    private updateCharge(_player: Player): void {
        // 冲撞伤害通过事件系统在 RunScene 中处理
        // 此处维持冲撞速度
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(this.chargeDirection * this.chargeSpeed);
    }

    /**
     * 停止冲撞
     */
    private stopCharge(): void {
        if (this.isDead) return;

        this.isCharging = false;
        this.isAttacking = false;
        this.currentState = EnemyState.IDLE;
        this.setTint(this.getPhaseColor());

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        // 冲撞后较长冷却
        this.scene.time.delayedCall(this.config.attackCooldown * 1.5, () => {
            this.canAttack = true;
        });
    }

    /**
     * 获取当前阶段颜色
     */
    private getPhaseColor(): number {
        switch (this.bossPhase) {
            case BossPhase.PHASE_1: return 0x888888;
            case BossPhase.PHASE_2: return 0xcc6600;
            case BossPhase.PHASE_3: return 0xff2200;
        }
    }

    /**
     * 销毁岩石投射物
     */
    public destroyRock(rock: Phaser.Physics.Arcade.Sprite): void {
        const index = this.rocks.indexOf(rock);
        if (index !== -1) {
            this.rocks.splice(index, 1);
        }
        if (rock.active) {
            rock.destroy();
        }
    }

    /**
     * 重写死亡 — Boss 死亡有特殊效果
     */
    protected die(): void {
        this.isDead = true;
        this.currentState = EnemyState.DEAD;

        // 通知场景敌人被击杀（基类 die() 中负责，但此处重写未调用 super）
        this.scene.events.emit('enemy-killed');

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.enable = false;

        // 销毁血条
        if (this.healthBarBg) { this.healthBarBg.destroy(); }
        if (this.healthBarFill) { this.healthBarFill.destroy(); }

        // 清理投射物
        this.rocks.forEach(r => r.destroy());
        this.rocks = [];

        // Boss 死亡：慢动作 + 大爆炸
        this.scene.time.timeScale = 0.3;

        // 多次粒子爆炸
        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 200, () => {
                const offsetX = Phaser.Math.Between(-30, 30);
                const offsetY = Phaser.Math.Between(-40, 10);
                EffectsManager.createDeathParticles(this.scene, this.x + offsetX, this.y + offsetY);
            });
        }

        // 最终爆炸
        this.scene.time.delayedCall(1200, () => {
            this.scene.cameras.main.shake(500, 0.03);
            EffectsManager.createDeathParticles(this.scene, this.x, this.y);

            // 恢复时间速度
            this.scene.time.timeScale = 1;

            // 发出 Boss 击败事件
            this.scene.events.emit('boss-defeated', {
                bossId: 'stone_golem',
                bossName: ENEMY_TABLE.stone_golem.name,
            });

            // 渐隐消失
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    this.destroy();
                },
            });
        });
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead || this.isCharging || this.isTransitioning) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }
}
