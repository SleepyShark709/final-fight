/**
 * 爆炸虫敌人
 * 快速接近玩家后自爆，造成范围伤害
 * 行为：发现玩家 → 快速冲向玩家 → 引信闪烁 → 爆炸 → 死亡
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';
import { EffectsManager } from '@/utils/EffectsManager';

/** 爆炸虫状态 */
enum BombBugPhase {
    /** 正常移动/巡逻 */
    ROAMING,
    /** 冲向玩家 */
    CHARGING,
    /** 引信倒计时（闪烁） */
    FUSING,
    /** 已爆炸 */
    EXPLODED,
}

export class BombBugEnemy extends Enemy {
    private bombPhase: BombBugPhase = BombBugPhase.ROAMING;
    private fuseTimer: number = 0;
    private fuseStartTime: number = 0;
    private flashToggle: boolean = false;
    private readonly fuseTime: number;
    private readonly explosionRadius: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.bomb_bug;
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

        this.fuseTime = (entry.extra?.fuseTime as number) || 1200;
        this.explosionRadius = (entry.extra?.explosionRadius as number) || 80;

        this.setScale(entry.scale);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 绿色色调区分普通骷髅
        this.setTint(0x44ff44);

        this.play('skeleton-idle');
    }

    /**
     * 重写 AI — 爆炸虫有独立行为逻辑
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isStunned) return;

        switch (this.bombPhase) {
            case BombBugPhase.ROAMING:
                this.handleRoaming(distanceToPlayer, player);
                break;
            case BombBugPhase.CHARGING:
                this.handleCharging(player);
                break;
            case BombBugPhase.FUSING:
                this.handleFusing(player);
                break;
            case BombBugPhase.EXPLODED:
                // 什么也不做
                break;
        }
    }

    private handleRoaming(distanceToPlayer: number, _player: Player): void {
        if (distanceToPlayer <= this.config.detectRange) {
            // 发现玩家，切换到冲锋
            this.bombPhase = BombBugPhase.CHARGING;
            return;
        }
        // 正常巡逻
        this.currentState = EnemyState.PATROL;
        this.patrol();
    }

    private handleCharging(player: Player): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // 冲向玩家
        if (player.x < this.x) {
            this.setFlipX(true);
            body.setVelocityX(-this.config.speed);
        } else {
            this.setFlipX(false);
            body.setVelocityX(this.config.speed);
        }
        this.currentState = EnemyState.CHASE;

        // 到达攻击范围，开始引信
        if (distance <= this.config.attackRange) {
            this.bombPhase = BombBugPhase.FUSING;
            this.fuseStartTime = this.scene.time.now;
            body.setVelocityX(0);
        }
    }

    private handleFusing(player: Player): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        const elapsed = this.scene.time.now - this.fuseStartTime;

        // 闪烁效果：越接近爆炸闪烁越快
        const flashInterval = Math.max(50, 200 - (elapsed / this.fuseTime) * 180);
        this.fuseTimer += this.scene.game.loop.delta;
        if (this.fuseTimer >= flashInterval) {
            this.fuseTimer = 0;
            this.flashToggle = !this.flashToggle;
            this.setTint(this.flashToggle ? 0xff0000 : 0xffff00);
        }

        // 膨胀效果
        const progress = elapsed / this.fuseTime;
        const swellScale = ENEMY_TABLE.bomb_bug.scale * (1 + progress * 0.3);
        this.setScale(swellScale);

        // 引信完毕，爆炸
        if (elapsed >= this.fuseTime) {
            this.explode(player);
        }
    }

    /**
     * 自爆
     */
    private explode(player: Player): void {
        this.bombPhase = BombBugPhase.EXPLODED;

        // 爆炸视觉效果
        EffectsManager.createDeathParticles(this.scene, this.x, this.y - 10);

        // 爆炸范围伤害圈（视觉）
        const circle = this.scene.add.circle(this.x, this.y, this.explosionRadius, 0xff4400, 0.4);
        circle.setDepth(40);
        this.scene.tweens.add({
            targets: circle,
            alpha: 0,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300,
            onComplete: () => circle.destroy(),
        });

        // 检测玩家是否在爆炸范围内
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distToPlayer <= this.explosionRadius) {
            // 通过事件让 RunScene 处理伤害（避免循环引用）
            this.scene.events.emit('bomb-explosion', {
                x: this.x,
                y: this.y,
                damage: this.config.attackDamage,
                radius: this.explosionRadius,
            });
        }

        // 自己死亡
        this.die();
    }

    /**
     * 爆炸虫被击杀时也会爆炸（但伤害减半）
     */
    protected die(): void {
        if (this.bombPhase !== BombBugPhase.EXPLODED) {
            // 被击杀触发小爆炸
            this.bombPhase = BombBugPhase.EXPLODED;

            const circle = this.scene.add.circle(this.x, this.y, this.explosionRadius * 0.5, 0xff8800, 0.3);
            circle.setDepth(40);
            this.scene.tweens.add({
                targets: circle,
                alpha: 0,
                duration: 200,
                onComplete: () => circle.destroy(),
            });

            // 小范围爆炸事件
            this.scene.events.emit('bomb-explosion', {
                x: this.x,
                y: this.y,
                damage: Math.round(this.config.attackDamage * 0.5),
                radius: this.explosionRadius * 0.5,
            });
        }
        super.die();
    }

    protected playAttackAnimation(): void {
        // 爆炸虫不使用普通攻击动画
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isDead || this.bombPhase === BombBugPhase.FUSING) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (isMoving && this.anims.currentAnim?.key !== 'skeleton-walk') {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }
}
