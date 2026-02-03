/**
 * 骷髅敌人类
 * 继承自 Enemy 基类，使用骷髅素材
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from './Enemy';
import { ENEMY_CONFIG, ASSETS } from '../utils/Constants';

export class SkeletonEnemy extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(
            scene,
            x,
            y,
            `${ASSETS.ENEMY_SKELETON_IDLE}-0`,
            ENEMY_CONFIG.skeleton,
        );

        // 设置缩放（使用配置中的值）
        this.setScale(ENEMY_CONFIG.skeleton.scale);

        // 设置碰撞体积（基于100*75的素材比例）
        this.setSize(
            ENEMY_CONFIG.skeleton.collisionWidth,
            ENEMY_CONFIG.skeleton.collisionHeight,
        );
        this.setOffset(
            ENEMY_CONFIG.skeleton.offsetX,
            ENEMY_CONFIG.skeleton.offsetY,
        );

        // 播放待机动画
        this.play('skeleton-idle');
    }

    /**
     * 播放攻击动画
     */
    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
    }

    /**
     * 更新动画
     */
    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        switch (this.currentState) {
            case EnemyState.PATROL:
            case EnemyState.CHASE:
                if (
                    isMoving &&
                    this.anims.currentAnim?.key !== 'skeleton-walk'
                ) {
                    this.play('skeleton-walk', true);
                }
                break;
            case EnemyState.IDLE:
            default:
                if (
                    !isMoving &&
                    this.anims.currentAnim?.key !== 'skeleton-idle'
                ) {
                    this.play('skeleton-idle', true);
                }
                break;
        }
    }
}
