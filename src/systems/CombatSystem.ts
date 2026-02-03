/**
 * 战斗系统
 * 处理攻击判定、伤害计算等
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class CombatSystem {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 检查攻击是否命中
     */
    public checkAttackHit(
        attacker: Phaser.Physics.Arcade.Sprite,
        target: Phaser.Physics.Arcade.Sprite,
        attackRange: number,
    ): boolean {
        const distance = Phaser.Math.Distance.Between(
            attacker.x,
            attacker.y,
            target.x,
            target.y,
        );

        return distance <= attackRange;
    }

    /**
     * 处理玩家攻击敌人
     */
    public playerAttackEnemy(player: Player, enemy: Enemy): void {
        if (!player.isAttacking || enemy.isDead) return;

        const distance = Phaser.Math.Distance.Between(
            player.x,
            player.y,
            enemy.x,
            enemy.y,
        );

        // 检查是否在攻击范围内
        if (distance <= 80) {
            // 检查攻击方向
            const isFacingEnemy =
                (player.flipX && enemy.x < player.x) ||
                (!player.flipX && enemy.x > player.x);

            if (isFacingEnemy) {
                enemy.takeDamage(player.attackDamage);
            }
        }
    }

    /**
     * 处理敌人攻击玩家
     */
    public enemyAttackPlayer(enemy: Enemy, player: Player): void {
        if (!enemy.isAttacking || enemy.isDead || player.isInvincible) return;

        const distance = Phaser.Math.Distance.Between(
            enemy.x,
            enemy.y,
            player.x,
            player.y,
        );

        if (distance <= 60) {
            player.takeDamage(enemy.attackDamage);
        }
    }

    /**
     * 计算伤害（可扩展加入暴击、护甲等）
     */
    public calculateDamage(
        baseDamage: number,
        _attacker?: unknown,
        _defender?: unknown,
    ): number {
        // 基础伤害计算，后续可以扩展
        // 例如：暴击、护甲减免、元素克制等
        return baseDamage;
    }

    /**
     * 创建击退效果
     */
    public applyKnockback(
        target: Phaser.Physics.Arcade.Sprite,
        sourceX: number,
        force: number,
    ): void {
        const direction = target.x > sourceX ? 1 : -1;
        const body = target.body as Phaser.Physics.Arcade.Body;

        body.setVelocityX(direction * force);
        body.setVelocityY(-force * 0.3);
    }

    /**
     * 创建伤害数字显示
     */
    public showDamageNumber(x: number, y: number, damage: number): void {
        const text = this.scene.add.text(x, y - 20, `-${damage}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 2,
        });
        text.setOrigin(0.5);

        // 上浮并消失的动画
        this.scene.tweens.add({
            targets: text,
            y: y - 60,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            },
        });
    }
}
