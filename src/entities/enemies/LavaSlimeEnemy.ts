/**
 * 熔岩史莱姆 — 死亡后分裂成2个小史莱姆
 * 外观：骷髅动画 + 橙色 tint + 小体型
 * 核心特性：大史莱姆死亡时分裂，小史莱姆不再分裂
 */
import { Enemy, EnemyState } from '../Enemy';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';

export class LavaSlimeEnemy extends Enemy {
    /** 是否为分裂产生的小史莱姆（小史莱姆死亡不再分裂） */
    private readonly isSplit: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, isSplit = false) {
        const entry = ENEMY_TABLE.lava_slime;
        const healthMult = isSplit ? (entry.extra?.splitHealthRatio as number || 0.4) : 1;
        const scaleMult = isSplit ? (entry.extra?.splitScaleRatio as number || 0.6) : 1;

        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, {
            maxHealth: Math.round(entry.maxHealth * healthMult),
            speed: entry.speed * (isSplit ? 1.3 : 1),
            attackDamage: Math.round(entry.attackDamage * (isSplit ? 0.6 : 1)),
            attackRange: entry.attackRange,
            attackCooldown: entry.attackCooldown,
            detectRange: entry.detectRange,
            patrolRange: entry.patrolRange,
            mass: entry.mass * (isSplit ? 0.5 : 1),
            knockbackForce: entry.knockbackForce,
        });

        this.isSplit = isSplit;
        this.setScale(entry.scale * scaleMult);
        this.setSize(entry.collisionWidth, entry.collisionHeight);
        this.setOffset(entry.offsetX, entry.offsetY);

        // 橙色 tint
        this.setTint(0xff8800);

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

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

    /**
     * 重写死亡：大史莱姆死亡时分裂成小史莱姆
     */
    protected die(): void {
        if (!this.isSplit) {
            this.splitIntoSmall();
        }
        super.die();
    }

    /**
     * 分裂成小史莱姆
     */
    private splitIntoSmall(): void {
        const splitCount = (ENEMY_TABLE.lava_slime.extra?.splitCount as number) || 2;
        for (let i = 0; i < splitCount; i++) {
            const offsetX = (i === 0 ? -30 : 30);
            const small = new LavaSlimeEnemy(this.scene, this.x + offsetX, this.y, true);
            small.setDepth(DEPTH.ENEMIES);

            // 通知 RunScene 将小史莱姆加入敌人组
            this.scene.events.emit('enemy-spawned', small);
        }
    }
}
