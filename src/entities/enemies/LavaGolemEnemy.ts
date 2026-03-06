/**
 * 熔岩魔像精英怪
 * 高血量、高伤害、缓慢移动的近战精英
 * 有独立精灵资源，不需要 tint 标记
 */
import { Enemy, EnemyState } from '../Enemy';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS } from '@/utils/Constants';

export class LavaGolemEnemy extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.lava_golem;
        super(scene, x, y, `${ASSETS.ENEMY_LAVA_GOLEM}-1`, {
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

        // 熔岩魔像有独立精灵，不需要 tint
        this.play('lava-golem-idle');
    }

    protected playAttackAnimation(): void {
        this.play('lava-golem-attack', true);
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        switch (this.currentState) {
            case EnemyState.PATROL:
            case EnemyState.CHASE:
                if (isMoving && this.anims.currentAnim?.key !== 'lava-golem-walk') {
                    this.play('lava-golem-walk', true);
                }
                break;
            case EnemyState.IDLE:
            default:
                if (!isMoving && this.anims.currentAnim?.key !== 'lava-golem-idle') {
                    this.play('lava-golem-idle', true);
                }
                break;
        }
    }
}
