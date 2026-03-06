/**
 * 火法师 — 熔岩区远程敌人
 * 基于 ArcherEnemy 模式：保持距离 + 发射火球投射物
 * 外观：骷髅动画 + 红色 tint
 */
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { ENEMY_TABLE } from '@/config/EnemyTable';
import { ASSETS, DEPTH } from '@/utils/Constants';

export class FireMageEnemy extends Enemy {
    /** 活跃投射物列表（供 RunScene 做碰撞检测） */
    public projectiles: Phaser.Physics.Arcade.Sprite[] = [];

    private readonly preferredDistance: number;
    private readonly minDistance: number;
    private readonly projectileSpeed: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const entry = ENEMY_TABLE.fire_mage;
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

        // 红色 tint
        this.setTint(0xff3300);

        this.preferredDistance = (entry.extra?.preferredDistance as number) || 220;
        this.minDistance = (entry.extra?.minDistance as number) || 150;
        this.projectileSpeed = (entry.extra?.projectileSpeed as number) || 200;

        this.play('skeleton-idle');
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
     * 重写 AI：保持距离 + 远程射击
     */
    protected updateAI(distanceToPlayer: number, player: Player): void {
        if (this.isAttacking || this.isPreparing || this.isStunned) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (distanceToPlayer > this.config.detectRange) {
            // 超出检测范围：巡逻
            this.currentState = EnemyState.PATROL;
            this.patrol();
            return;
        }

        // 面朝玩家
        this.setFlipX(player.x < this.x);
        this.currentState = EnemyState.CHASE;

        // 保持距离逻辑
        if (distanceToPlayer < this.minDistance) {
            // 太近：后退
            const fleeDir = this.x > player.x ? 1 : -1;
            body.setVelocityX(fleeDir * this.config.speed);
        } else if (distanceToPlayer > this.preferredDistance) {
            // 太远：靠近
            const chaseDir = player.x > this.x ? 1 : -1;
            body.setVelocityX(chaseDir * this.config.speed * 0.7);
        } else {
            // 理想距离：停下
            body.setVelocityX(0);
        }

        // 攻击判定
        if (distanceToPlayer <= this.config.attackRange && this.canAttack) {
            this.fireProjectile(player);
        }
    }

    /**
     * 发射火球投射物
     */
    private fireProjectile(player: Player): void {
        this.canAttack = false;
        this.isAttacking = true;
        this.playAttackAnimation();

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(0);

        this.once('animationcomplete', () => {
            if (this.isDead) return;
            this.isAttacking = false;

            // 创建火球 — 使用 tileset-grass 精灵 + 橙红 tint
            const fireball = this.scene.physics.add.sprite(
                this.x, this.y - 10,
                `${ASSETS.TILESET_GRASS}-1`,
            );
            fireball.setScale(0.4);
            fireball.setTint(0xff4400);
            fireball.setDepth(DEPTH.EFFECTS);

            const fbBody = fireball.body as Phaser.Physics.Arcade.Body;
            fbBody.setAllowGravity(false);

            // 瞄准玩家发射
            const dirX = player.x - this.x;
            const dirY = player.y - this.y;
            const angle = Math.atan2(dirY, dirX);
            fbBody.setVelocityX(Math.cos(angle) * this.projectileSpeed);
            fbBody.setVelocityY(Math.sin(angle) * this.projectileSpeed);

            this.projectiles.push(fireball);

            // 超时销毁
            this.scene.time.delayedCall(4000, () => {
                this.destroyProjectile(fireball);
            });

            // 攻击冷却
            this.scene.time.delayedCall(this.config.attackCooldown, () => {
                this.canAttack = true;
            });
        });
    }

    /**
     * 销毁投射物并从列表移除
     */
    public destroyProjectile(proj: Phaser.Physics.Arcade.Sprite): void {
        const index = this.projectiles.indexOf(proj);
        if (index !== -1) this.projectiles.splice(index, 1);
        if (proj.active) proj.destroy();
    }

    /**
     * 销毁时清理所有投射物
     */
    protected die(): void {
        for (const proj of [...this.projectiles]) {
            this.destroyProjectile(proj);
        }
        super.die();
    }
}
