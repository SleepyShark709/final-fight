/**
 * 盾兵敌人
 * 正面有盾牌阻挡伤害，攻击后短暂放下盾牌
 * 外观：骷髅动画 + 金色 tint + 略大体型
 */
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMY_CONFIG, ASSETS } from '../utils/Constants';

const CFG = ENEMY_CONFIG.shield;

export class ShieldEnemy extends Enemy {
    // 盾牌状态：true = 盾牌举起（正面免疫伤害）
    public isShieldUp: boolean = true;

    // 盾牌视觉指示器（简单图形）
    private shieldGraphic!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, `${ASSETS.ENEMY_SKELETON_IDLE}-0`, CFG);

        this.setScale(CFG.scale);
        this.setSize(CFG.collisionWidth, CFG.collisionHeight);
        this.setOffset(CFG.offsetX, CFG.offsetY);

        // 金色 tint
        this.setTint(0xffcc44);

        this.play('skeleton-idle');

        // 创建盾牌图标
        this.shieldGraphic = scene.add.graphics();
        this.shieldGraphic.setDepth(this.depth + 1);
        this.drawShield(true);
    }

    /**
     * 绘制/隐藏盾牌图标
     */
    private drawShield(visible: boolean): void {
        this.shieldGraphic.clear();
        if (!visible || this.isDead) return;

        const shieldSide = this.flipX ? -1 : 1; // 盾在朝向一侧
        const sx = this.x + shieldSide * 22;
        const sy = this.y - 10;

        this.shieldGraphic.fillStyle(0xaaddff, 0.85);
        this.shieldGraphic.fillRoundedRect(sx - 6, sy - 16, 12, 32, 4);
        this.shieldGraphic.lineStyle(2, 0x4488cc, 1);
        this.shieldGraphic.strokeRoundedRect(sx - 6, sy - 16, 12, 32, 4);
    }

    protected playAttackAnimation(): void {
        // 攻击时放下盾牌
        this.isShieldUp = false;
        this.drawShield(false);

        this.play('skeleton-attack', true);

        // 攻击冷却后盾牌恢复
        this.scene.time.delayedCall(CFG.shieldDownDuration, () => {
            if (!this.isDead) {
                this.isShieldUp = true;
                this.drawShield(true);
            }
        });
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

        // 同步盾牌图标位置
        this.drawShield(this.isShieldUp);
    }

    /**
     * 重写受击：正面攻击被盾牌格挡
     */
    public takeDamage(damage: number, knockbackDir: number = 0): void {
        if (this.isDead) return;

        // 判断是否为正面攻击（盾牌格挡方向）
        // 盾牌举起时：正面攻击方向 = 敌人朝向的方向
        // flipX=true → 朝左，正面在左 → knockbackDir=1（玩家在左，推向右）= 正面攻击
        // flipX=false → 朝右，正面在右 → knockbackDir=-1（玩家在右，推向左）= 正面攻击
        const isFrontalAttack =
            (this.flipX && knockbackDir === 1) ||
            (!this.flipX && knockbackDir === -1);

        if (this.isShieldUp && isFrontalAttack) {
            // 盾牌格挡：只有 10% 穿透伤害 + 明显的视觉反馈
            const blockedDamage = Math.ceil(damage * 0.1);

            // 盾牌格挡闪光（白色）
            this.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (!this.isDead) this.setTint(0xffcc44);
            });

            // 格挡时有轻微后退
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocityX(knockbackDir * 30);

            // 扣少量穿透血量并更新血条
            this.health -= blockedDamage;
            this.updateHealthBar();
            if (this.health <= 0) {
                this.die();
            }
            return;
        }

        // 非正面攻击或盾牌放下：正常受击
        super.takeDamage(damage, knockbackDir);
    }

    protected die(): void {
        if (this.shieldGraphic) {
            this.shieldGraphic.destroy();
        }
        super.die();
    }
}
