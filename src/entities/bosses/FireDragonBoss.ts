/**
 * 烈焰龙 — 熔岩区域 Boss
 *
 * 3阶段 Boss：
 * Phase 1 (100%~60%): 地面移动 + 火焰吐息（扇形AoE）+ 尾扫（近战）
 * Phase 2 (60%~30%):  飞到空中 + 俯冲攻击 + 召唤fire_bat
 * Phase 3 (30%~0%):   狂暴，交替地面/空中 + 火雨覆盖
 *
 * 攻击预兆：
 *   - 火焰吐息：橙红色闪烁 600ms → 扇形AoE
 *   - 尾扫：黄色闪烁 400ms → 近战大范围横扫
 *   - 俯冲：飞高蓄力 → 冲向玩家位置 → 落地震波
 *   - 召唤：紫色闪烁 → emit boss-summon 事件
 *   - 火雨：5个红色警告圈 500ms → 延迟爆炸伤害
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
    TAIL_SWIPE,      // 尾扫（近战）
    FIRE_BREATH,     // 火焰吐息（扇形AoE）
    DIVE_ATTACK,     // 俯冲攻击
    SUMMON,          // 召唤fire_bat
    FIRE_RAIN,       // 火雨覆盖
}

/** 火雨警告标记 */
interface FireRainMarker {
    circle: Phaser.GameObjects.Arc;
    x: number;
    y: number;
}

export class FireDragonBoss extends Enemy {
    // Boss 阶段
    private bossPhase: BossPhase = BossPhase.PHASE_1;

    // Boss 特殊属性
    private readonly phase2Threshold: number;
    private readonly phase3Threshold: number;
    private readonly breathDamage: number;
    private readonly breathRange: number;
    private readonly diveDamage: number;
    private readonly diveSpeed: number;
    private readonly fireRainDamage: number;

    // 攻击模式
    private currentAttackType: BossAttackType = BossAttackType.TAIL_SWIPE;
    private attackPattern: BossAttackType[] = [];
    private attackPatternIndex: number = 0;

    // 飞行状态
    private isFlying: boolean = false;
    private readonly flyHeight: number = 150; // 飞行高度（相对地面）

    // 俯冲状态
    private isDiving: boolean = false;
    private diveTargetX: number = 0;
    private diveTargetY: number = 0;

    // 火雨标记
    private fireRainMarkers: FireRainMarker[] = [];

    // 阶段转换中
    private isTransitioning: boolean = false;

    // 地面Y位置（用于落地检测）
    private groundY: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        // 尝试从 EnemyTable 读取，fallback 硬编码默认值
        const entry = ENEMY_TABLE.fire_dragon ?? {
            id: 'fire_dragon',
            name: '烈焰龙',
            tier: 'boss' as const,
            maxHealth: 800,
            speed: 60,
            attackDamage: 20,
            attackRange: 80,
            attackCooldown: 2000,
            detectRange: 500,
            patrolRange: 60,
            scale: 2.0,
            mass: 6.0,
            knockbackForce: 20,
            collisionWidth: 70,
            collisionHeight: 80,
            offsetX: 15,
            offsetY: 0,
            goldDrop: [80, 120] as [number, number],
            shardDrop: [15, 25] as [number, number],
            extra: {
                phase2Threshold: 0.6,
                phase3Threshold: 0.3,
                breathDamage: 18,
                breathRange: 180,
                diveDamage: 30,
                diveSpeed: 400,
                fireRainDamage: 25,
                fireRainCount: 5,
            },
        };

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
        this.breathDamage = (extra.breathDamage as number) || 18;
        this.breathRange = (extra.breathRange as number) || 180;
        this.diveDamage = (extra.diveDamage as number) || 30;
        this.diveSpeed = (extra.diveSpeed as number) || 400;
        this.fireRainDamage = (extra.fireRainDamage as number) || 25;

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 记录地面Y坐标
        this.groundY = y;

        // Phase 1 色调：暗红色
        this.setTint(0xff2200);

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
                // 地面战：火焰吐息 + 尾扫交替
                this.attackPattern = [
                    BossAttackType.TAIL_SWIPE,
                    BossAttackType.FIRE_BREATH,
                    BossAttackType.TAIL_SWIPE,
                ];
                break;
            case BossPhase.PHASE_2:
                // 空中战：俯冲 + 召唤 + 火焰吐息
                this.attackPattern = [
                    BossAttackType.DIVE_ATTACK,
                    BossAttackType.FIRE_BREATH,
                    BossAttackType.SUMMON,
                    BossAttackType.DIVE_ATTACK,
                ];
                break;
            case BossPhase.PHASE_3:
                // 狂暴：地空交替 + 火雨
                this.attackPattern = [
                    BossAttackType.FIRE_RAIN,
                    BossAttackType.DIVE_ATTACK,
                    BossAttackType.FIRE_BREATH,
                    BossAttackType.TAIL_SWIPE,
                    BossAttackType.FIRE_RAIN,
                    BossAttackType.SUMMON,
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

        // 俯冲中持续移动
        if (this.isDiving) {
            this.updateDive();
            return;
        }

        // 阶段检测
        this.checkPhaseTransition();

        // 在攻击范围内
        if (distanceToPlayer <= this.getEffectiveRange()) {
            this.performNextAttack(player);
        } else if (distanceToPlayer <= this.config.detectRange) {
            // 追击
            this.currentState = EnemyState.CHASE;
            const body = this.body as Phaser.Physics.Arcade.Body;
            const speed = this.getPhaseSpeed();

            if (this.isFlying) {
                // 空中追击：向玩家水平移动
                if (player.x < this.x) {
                    this.setFlipX(true);
                    body.setVelocityX(-speed);
                } else {
                    this.setFlipX(false);
                    body.setVelocityX(speed);
                }
                // 保持飞行高度
                body.setVelocityY(0);
            } else {
                // 地面追击
                if (player.x < this.x) {
                    this.setFlipX(true);
                    body.setVelocityX(-speed);
                } else {
                    this.setFlipX(false);
                    body.setVelocityX(speed);
                }
            }
        } else {
            this.currentState = EnemyState.IDLE;
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocityX(0);
            if (this.isFlying) {
                body.setVelocityY(0);
            }
        }
    }

    /**
     * 根据阶段获取移动速度
     */
    private getPhaseSpeed(): number {
        switch (this.bossPhase) {
            case BossPhase.PHASE_1: return this.config.speed;
            case BossPhase.PHASE_2: return this.config.speed * 1.3;
            case BossPhase.PHASE_3: return this.config.speed * 1.7;
        }
    }

    /**
     * 获取当前阶段有效攻击范围
     */
    private getEffectiveRange(): number {
        const nextAttack = this.attackPattern[this.attackPatternIndex];
        switch (nextAttack) {
            case BossAttackType.TAIL_SWIPE: return this.config.attackRange;
            case BossAttackType.FIRE_BREATH: return this.breathRange * 0.8;
            case BossAttackType.DIVE_ATTACK: return 300; // 俯冲有较大触发范围
            case BossAttackType.SUMMON: return 250;
            case BossAttackType.FIRE_RAIN: return 350; // 火雨远距离触发
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
        body.setVelocityY(0);

        // 转换视觉：震动 + 变色
        this.setTint(0xffffff);
        this.scene.cameras.main.shake(600, 0.015);

        // Phase 2 进入飞行状态
        if (phase === BossPhase.PHASE_2) {
            this.startFlying();
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.scaleX * 1.15,
            scaleY: this.scaleY * 1.15,
            duration: 400,
            yoyo: true,
            onComplete: () => {
                this.setTint(this.getPhaseColor());
                this.isTransitioning = false;
                this.buildAttackPattern();

                // 发出阶段转换事件
                const bossName = ENEMY_TABLE.fire_dragon?.name ?? '烈焰龙';
                this.scene.events.emit('boss-phase-change', {
                    phase: phase,
                    bossName: bossName,
                });
            },
        });
    }

    /**
     * 进入飞行状态
     */
    private startFlying(): void {
        this.isFlying = true;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);

        // 飞到高处
        this.scene.tweens.add({
            targets: this,
            y: this.groundY - this.flyHeight,
            duration: 600,
            ease: 'Power2',
        });
    }

    /**
     * 降落到地面
     */
    private land(): void {
        this.isFlying = false;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
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
            case BossAttackType.TAIL_SWIPE:
                this.performTailSwipe(player);
                break;
            case BossAttackType.FIRE_BREATH:
                this.performFireBreath(player);
                break;
            case BossAttackType.DIVE_ATTACK:
                this.performDiveAttack(player);
                break;
            case BossAttackType.SUMMON:
                this.performSummon(player);
                break;
            case BossAttackType.FIRE_RAIN:
                this.performFireRain(player);
                break;
        }
    }

    // ===== 攻击实现 =====

    /**
     * 尾扫 — 近战大范围横扫
     */
    private performTailSwipe(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：黄色闪烁
        this.setTint(0xffff00);

        this.scene.time.delayedCall(400, () => {
            if (this.isDead) return;

            this.clearTint();
            this.setTint(this.getPhaseColor());
            this.isPreparing = false;
            this.isAttacking = true;

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
     * 火焰吐息 — 扇形AoE，复用 boss-quake 事件传递伤害
     */
    private performFireBreath(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：橙红色闪烁
        this.setTint(0xff6600);

        this.scene.time.delayedCall(600, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            this.isAttacking = true;
            this.setTint(this.getPhaseColor());

            this.playAttackAnimation();

            // 火焰吐息方向
            const direction = this.flipX ? -1 : 1;
            const breathX = this.x + direction * 60;
            const breathY = this.y;

            // 火焰吐息视觉效果 — 扇形火焰
            this.createBreathVisual(breathX, breathY, direction);

            // 火焰吐息伤害事件
            this.scene.events.emit('boss-quake', {
                x: breathX + direction * 40,
                y: breathY,
                damage: this.breathDamage,
                range: this.breathRange,
            });

            this.once('animationcomplete', () => {
                this.isAttacking = false;
                this.currentState = EnemyState.IDLE;
            });

            this.scene.time.delayedCall(this.config.attackCooldown * 0.9, () => {
                this.canAttack = true;
            });
        });
    }

    /**
     * 创建火焰吐息视觉效果
     */
    private createBreathVisual(x: number, y: number, direction: number): void {
        // 创建多个火焰粒子组成扇形
        for (let i = 0; i < 8; i++) {
            const angle = (direction > 0 ? -30 : 150) + i * (60 / 8);
            const rad = Phaser.Math.DegToRad(angle);
            const dist = Phaser.Math.Between(40, this.breathRange);

            const particle = this.scene.add.circle(
                x, y,
                Phaser.Math.Between(4, 10),
                Phaser.Math.Between(0xff4400, 0xffaa00),
                0.8,
            );
            particle.setDepth(DEPTH.EFFECTS);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(rad) * dist,
                y: y + Math.sin(rad) * dist,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy(),
            });
        }
    }

    /**
     * 俯冲攻击 — 飞高 → 冲向玩家位置 → 落地地震
     */
    private performDiveAttack(player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 如果不在空中，先飞起来
        if (!this.isFlying) {
            body.setAllowGravity(false);
        }

        // 预兆：飞高蓄力
        this.setTint(0xff0000);

        // 先飞到高处
        this.scene.tweens.add({
            targets: this,
            y: this.groundY - this.flyHeight - 80,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (this.isDead) return;

                this.isPreparing = false;
                this.isDiving = true;
                this.isAttacking = true;

                // 记录目标位置（玩家当前位置）
                this.diveTargetX = player.x;
                this.diveTargetY = this.groundY;

                // 计算俯冲方向
                const angle = Math.atan2(
                    this.diveTargetY - this.y,
                    this.diveTargetX - this.x,
                );
                body.setVelocityX(Math.cos(angle) * this.diveSpeed);
                body.setVelocityY(Math.sin(angle) * this.diveSpeed);

                // 俯冲超时保护
                this.scene.time.delayedCall(1500, () => {
                    if (this.isDiving) {
                        this.finishDive();
                    }
                });
            },
        });
    }

    /**
     * 更新俯冲状态
     */
    private updateDive(): void {
        // 检测是否接近地面
        if (this.y >= this.groundY - 20) {
            this.finishDive();
        }
    }

    /**
     * 完成俯冲 — 落地触发地震
     */
    private finishDive(): void {
        if (this.isDead) return;

        this.isDiving = false;
        this.isAttacking = false;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);
        body.setVelocityY(0);

        // 落地地震效果
        this.scene.cameras.main.shake(400, 0.025);

        // 地震波视觉
        const quakeCircle = this.scene.add.circle(
            this.x, this.y + 30,
            120,
            0xff4400, 0.4,
        );
        quakeCircle.setDepth(DEPTH.EFFECTS);
        this.scene.tweens.add({
            targets: quakeCircle,
            alpha: 0,
            scaleX: 1.8,
            scaleY: 0.3,
            duration: 500,
            onComplete: () => quakeCircle.destroy(),
        });

        // 地震伤害
        this.scene.events.emit('boss-quake', {
            x: this.x,
            y: this.y,
            damage: this.diveDamage,
            range: 150,
        });

        this.setTint(this.getPhaseColor());
        this.currentState = EnemyState.IDLE;

        // 判断是否需要保持飞行
        if (this.bossPhase === BossPhase.PHASE_2) {
            // Phase 2 落地后重新起飞
            this.scene.time.delayedCall(800, () => {
                if (!this.isDead && !this.isTransitioning) {
                    this.startFlying();
                }
            });
        } else if (this.bossPhase === BossPhase.PHASE_3) {
            // Phase 3 交替地空
            this.isFlying = false;
            body.setAllowGravity(true);
        } else {
            // Phase 1 不应该有俯冲，但保险起见降落
            this.land();
        }

        this.scene.time.delayedCall(this.config.attackCooldown * 1.2, () => {
            this.canAttack = true;
        });
    }

    /**
     * 召唤 — 召唤 2 只 fire_bat
     */
    private performSummon(_player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：紫色闪烁
        this.setTint(0xaa00ff);

        this.scene.time.delayedCall(700, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            this.setTint(this.getPhaseColor());

            // 召唤视觉：身体放大闪烁
            this.scene.tweens.add({
                targets: this,
                scaleX: this.scaleX * 1.1,
                scaleY: this.scaleY * 1.1,
                duration: 200,
                yoyo: true,
            });

            // 发出召唤事件 — 左右各一只 fire_bat
            this.scene.events.emit('boss-summon', {
                type: 'fire_bat',
                x: this.x - 80,
                y: this.y - 60,
            });
            this.scene.events.emit('boss-summon', {
                type: 'fire_bat',
                x: this.x + 80,
                y: this.y - 60,
            });

            this.currentState = EnemyState.IDLE;

            this.scene.time.delayedCall(this.config.attackCooldown * 1.5, () => {
                this.canAttack = true;
            });
        });
    }

    /**
     * 火雨 — 5个随机位置，先显示红色警告圈 500ms，然后爆炸伤害
     */
    private performFireRain(player: Player): void {
        this.canAttack = false;
        this.isPreparing = true;
        this.currentState = EnemyState.ATTACK;

        // 预兆：深红色闪烁
        this.setTint(0xcc0000);

        this.scene.time.delayedCall(500, () => {
            if (this.isDead) return;

            this.isPreparing = false;
            this.setTint(this.getPhaseColor());

            // 生成5个火雨标记
            const markers: FireRainMarker[] = [];
            const worldBounds = this.scene.physics.world.bounds;

            for (let i = 0; i < 5; i++) {
                // 随机位置，围绕玩家散布
                const offsetX = Phaser.Math.Between(-200, 200);
                const markerX = Phaser.Math.Clamp(
                    player.x + offsetX,
                    worldBounds.left + 50,
                    worldBounds.right - 50,
                );
                const markerY = this.groundY;

                // 红色警告圈
                const warningCircle = this.scene.add.circle(
                    markerX, markerY,
                    40,
                    0xff0000, 0.3,
                );
                warningCircle.setDepth(DEPTH.EFFECTS);

                // 警告圈闪烁
                this.scene.tweens.add({
                    targets: warningCircle,
                    alpha: { from: 0.15, to: 0.5 },
                    duration: 250,
                    yoyo: true,
                    repeat: 1,
                });

                markers.push({ circle: warningCircle, x: markerX, y: markerY });
            }

            this.fireRainMarkers = markers;

            // 500ms 后爆炸
            this.scene.time.delayedCall(500, () => {
                if (this.isDead) return;

                markers.forEach(marker => {
                    // 销毁警告圈
                    marker.circle.destroy();

                    // 爆炸视觉
                    const explosion = this.scene.add.circle(
                        marker.x, marker.y,
                        50,
                        0xff4400, 0.7,
                    );
                    explosion.setDepth(DEPTH.EFFECTS);
                    this.scene.tweens.add({
                        targets: explosion,
                        alpha: 0,
                        scaleX: 2.0,
                        scaleY: 0.5,
                        duration: 400,
                        onComplete: () => explosion.destroy(),
                    });

                    // 爆炸伤害
                    this.scene.events.emit('boss-quake', {
                        x: marker.x,
                        y: marker.y,
                        damage: this.fireRainDamage,
                        range: 60,
                    });
                });

                this.fireRainMarkers = [];
                this.scene.cameras.main.shake(300, 0.01);
            });

            this.currentState = EnemyState.IDLE;

            this.scene.time.delayedCall(this.config.attackCooldown * 1.3, () => {
                this.canAttack = true;
            });
        });
    }

    /**
     * 获取当前阶段颜色
     */
    private getPhaseColor(): number {
        switch (this.bossPhase) {
            case BossPhase.PHASE_1: return 0xff2200;  // 暗红色
            case BossPhase.PHASE_2: return 0xff6600;  // 橙红色
            case BossPhase.PHASE_3: return 0xffaa00;  // 金色狂暴
        }
    }

    /**
     * 重写死亡 — Boss 死亡有华丽效果
     */
    protected die(): void {
        this.isDead = true;
        this.currentState = EnemyState.DEAD;

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.enable = false;
        body.setAllowGravity(false);

        // 清理火雨标记
        this.fireRainMarkers.forEach(m => m.circle.destroy());
        this.fireRainMarkers = [];

        // Boss 死亡：慢动作 + 大爆炸
        this.scene.time.timeScale = 0.3;

        // 7次粒子爆炸（比 StoneGolem 更华丽）
        for (let i = 0; i < 7; i++) {
            this.scene.time.delayedCall(i * 180, () => {
                const offsetX = Phaser.Math.Between(-40, 40);
                const offsetY = Phaser.Math.Between(-50, 10);
                EffectsManager.createDeathParticles(this.scene, this.x + offsetX, this.y + offsetY);
            });
        }

        // 最终爆炸
        this.scene.time.delayedCall(1500, () => {
            this.scene.cameras.main.shake(600, 0.04);

            // 大范围火焰爆炸视觉
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const dist = Phaser.Math.Between(30, 80);
                const px = this.x + Math.cos(angle) * dist;
                const py = this.y + Math.sin(angle) * dist;
                EffectsManager.createDeathParticles(this.scene, px, py);
            }

            // 恢复时间速度
            this.scene.time.timeScale = 1;

            // 发出 Boss 击败事件
            const bossName = ENEMY_TABLE.fire_dragon?.name ?? '烈焰龙';
            this.scene.events.emit('boss-defeated', {
                bossId: 'fire_dragon',
                bossName: bossName,
            });

            // 渐隐消失
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                duration: 800,
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
        if (this.isAttacking || this.isPreparing || this.isDead || this.isDiving || this.isTransitioning) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }
}
