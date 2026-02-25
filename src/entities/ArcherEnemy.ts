/**
 * 弓箭手敌人
 * 保持与玩家一定距离，发射投射物攻击
 * 外观：骷髅动画 + 蓝色 tint
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from './Enemy';
import { Player } from './Player';
import { ENEMY_CONFIG, ASSETS } from '../utils/Constants';

const CFG = ENEMY_CONFIG.archer;

export class ArcherEnemy extends Enemy {
    // 活跃投射物列表（供 GameScene 做碰撞检测）
    public projectiles: Phaser.Physics.Arcade.Image[] = [];

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, CFG);

        this.setScale(CFG.scale);
        this.setSize(CFG.collisionWidth, CFG.collisionHeight);
        this.setOffset(CFG.offsetX, CFG.offsetY);

        // 蓝色 tint 区分外观
        this.setTint(0x44aaff);

        this.play('skeleton-idle');
    }

    protected playAttackAnimation(): void {
        this.play('skeleton-attack', true);
        // 动画中段发射投射物
        this.scene.time.delayedCall(200, () => {
            if (!this.isDead) this.fireProjectile();
        });
    }

    protected updateAnimation(): void {
        if (this.isAttacking || this.isPreparing || this.isDead) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const isMoving = Math.abs(body.velocity.x) > 5;

        if (
            isMoving &&
            this.anims.currentAnim?.key !== 'skeleton-walk'
        ) {
            this.play('skeleton-walk', true);
        } else if (!isMoving && this.anims.currentAnim?.key !== 'skeleton-idle') {
            this.play('skeleton-idle', true);
        }
    }

    /**
     * 重写 AI：保持距离，接近时后退
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;
        if (this.currentState === EnemyState.IDLE) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
            return;
        }

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (distanceToPlayer > CFG.detectRange) {
            // 超出检测范围：巡逻
            this.currentState = EnemyState.PATROL;
            this.patrol();
            return;
        }

        // 面朝玩家
        this.setFlipX(player.x < this.x);

        if (distanceToPlayer <= CFG.minDistance) {
            // 太近了：后退远离玩家
            this.currentState = EnemyState.CHASE;
            const retreatDir = this.x > player.x ? 1 : -1;
            body.setVelocityX(retreatDir * CFG.speed);
        } else if (distanceToPlayer <= CFG.attackRange) {
            // 理想攻击范围：停下来射击
            body.setVelocityX(0);
            this.currentState = EnemyState.ATTACK;
            this.attack(player);
        } else {
            // 太远：向玩家靠近但保持 preferredDistance
            if (distanceToPlayer > CFG.preferredDistance) {
                this.currentState = EnemyState.CHASE;
                const chaseDir = player.x > this.x ? 1 : -1;
                body.setVelocityX(chaseDir * CFG.speed);
            } else {
                // 在理想距离内：静止等待
                body.setVelocityX(0);
                this.currentState = EnemyState.ATTACK;
                this.attack(player);
            }
        }
    }

    /**
     * 发射投射物
     */
    private fireProjectile(): void {
        const direction = this.flipX ? -1 : 1;
        const proj = this.scene.physics.add.image(
            this.x + direction * 20,
            this.y - 10,
            ASSETS.PROJECTILE,
        ) as Phaser.Physics.Arcade.Image;

        proj.setDepth(25);
        proj.setFlipX(direction < 0);
        (proj.body as Phaser.Physics.Arcade.Body).setVelocityX(
            direction * CFG.projectileSpeed,
        );
        (proj.body as Phaser.Physics.Arcade.Body).setGravityY(-800); // 平飞，不受重力
        (proj.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.projectiles.push(proj);

        // 3 秒后自动销毁
        this.scene.time.delayedCall(3000, () => {
            this.destroyProjectile(proj);
        });
    }

    /**
     * 销毁投射物并从列表移除
     */
    public destroyProjectile(proj: Phaser.Physics.Arcade.Image): void {
        const idx = this.projectiles.indexOf(proj);
        if (idx !== -1) this.projectiles.splice(idx, 1);
        if (proj.active) proj.destroy();
    }

    /**
     * 销毁时清理投射物
     */
    protected die(): void {
        for (const proj of [...this.projectiles]) {
            this.destroyProjectile(proj);
        }
        super.die();
    }
}
